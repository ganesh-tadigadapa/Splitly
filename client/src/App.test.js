import { render, screen } from '@testing-library/react';
import App from './App';

test('shows the sign-in screen when nobody is logged in', () => {
  render(<App />);
  expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});
