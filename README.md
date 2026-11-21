# Splitly

Live: https://ai-split-66al.vercel.app/

Splitting costs on a trip or in a shared flat usually ends with someone scrolling back through a group chat trying to work out who paid for what. And most splitting apps make you type every expense into a form, which is the part nobody wants to do.

So I built Splitly. You make a group, add expenses, and it works out everyone's balance and a short list of "who pays whom" payments to settle up. To cut down on typing, it uses Google Gemini to read receipt photos and turn sentences like *"I paid 600 for pizza for me, Raj and Anu"* into an expense. Amounts are in rupees.

## What it does

- Groups with a name, an emoji and a list of members
- Add an expense with who paid and who shares it (split equally)
- Balances per member, and a settle-up list. Clicking a payment marks it as settled
- A dashboard with the total tracked, number of people and groups, and "you owe" / "you're owed" on each group card
- **Receipt scan**: upload a photo and it fills in the title, total, category and up to 10 line items
- **Plain-English entry**: type what happened and it fills in the title, amount, category, payer and split. Names are only matched to people actually in the group
- **Auto-category** while you type a title (Food, Lodging, Transport, Activities, Shopping or General). It won't override a category you picked yourself
- **Group chatbot**: ask things like "what's our total?" and it answers using the group's expenses from the database. If there's no AI key or the call fails, it can still answer simple total questions on its own

## How it's put together

```
client/   React 19 (Create React App) + Axios
  src/App.js          dashboard, group view, balances, settle up
  src/components/     Login, Chatbot, CreateGroupModal, AddExpenseModal
server/   Node + Express 5 + MongoDB (Mongoose)
  routes/             auth, groups, expenses, ocr, ai, chat
  models/             Expense, Group, User, Settlement
```

Balances and settlements are calculated on the server from the saved expenses. The settle-up list matches the people who owe the most with the people who are owed the most until everything is cleared.

The AI calls go to Gemini 2.5 Flash through `@google/genai`. Since model output can be wrong, the server checks every category and member name against fixed lists before sending anything back to the client. The chatbot can also fall back to OpenAI (`gpt-3.5-turbo`), or to Groq (`llama-3.3-70b-versatile`) if the key starts with `gsk_`.

Passwords are hashed with bcrypt and login returns a JWT.

## Running it locally

You need Node, a MongoDB database (local or Atlas) and a Gemini API key if you want the AI features.

```bash
cd server
npm install
cp .env.example .env    # fill in your values
npm start               # runs on :5001
```

Then in another terminal:

```bash
cd client
npm install
npm start               # opens http://localhost:3000
```

Server settings in `server/.env`:

- `MONGO_URI`: defaults to a local MongoDB at `127.0.0.1:27017`
- `PORT`: defaults to `5001`, which is what the client expects
- `GEMINI_API_KEY`: turns on receipt scan, plain-English entry, auto-category and the chatbot
- `OPENAI_API_KEY`: optional, only used by the chatbot when there's no Gemini key
- `JWT_SECRET`: if you leave it out, the server makes a random one at startup and logs a warning, so tokens stop working after a restart

If you change the server port, set `REACT_APP_API_URL` in `client/.env` to match (it defaults to `http://localhost:5001`). Both folders have a `vercel.json` for deploying.

## API

Everything is under `/api`:

```
POST /auth/register                  create an account (409 if the email is taken)
POST /auth/login                     log in, get a token
POST /groups/create                  create a group
GET  /groups/user/:username          a user's groups with totals and their balance
POST /expenses/add                   add an expense, split equally
GET  /expenses/:groupId              a group's expenses, newest first
GET  /expenses/settlements/:groupId  who should pay whom
GET  /expenses/user/:username/groups group IDs a user has expenses in
POST /ocr/receipt                    read a base64 receipt image
POST /ai/categorize                  pick a category for a title
POST /ai/parse-expense               turn a sentence into expense fields
POST /chat                           ask the chatbot about a group
```

There are more notes on the AI parts in [AI_FEATURES.md](AI_FEATURES.md).

## Known limits

- Login returns a token, but the other routes don't check it yet. That's the next thing I'd fix.
- Splits are equal only. No custom shares or percentages.
