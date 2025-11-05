import { render, screen } from '@testing-library/react';
import App from './App';

test('renders sidebar brand', () => {
  render(<App />);
  const brand = screen.getByText(/Weekly Report Platform/i);
  expect(brand).toBeInTheDocument();
});
