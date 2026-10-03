import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './components/Home/Home';
import Login from './components/Login/Login';
import { storeAuth, getStoredUser, clearStoredAuth } from './api';

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Home page', () => {
  test('shows the hero heading and a start button', () => {
    renderWithRouter(<Home />);
    expect(screen.getByRole('heading', { name: /plan your degree/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start now/i })).toBeInTheDocument();
  });
});

describe('Login page', () => {
  test('rejects non-AUI email addresses', () => {
    renderWithRouter(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'someone@gmail.com' } });
    expect(screen.getByText(/use your aui email address/i)).toBeInTheDocument();
  });

  test('accepts AUI email addresses', () => {
    renderWithRouter(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a.example@aui.ma' } });
    expect(screen.queryByText(/use your aui email address/i)).not.toBeInTheDocument();
  });
});

describe('stored auth', () => {
  afterEach(() => clearStoredAuth());

  test('remember me keeps the user in localStorage', () => {
    storeAuth({ fullName: 'Test User' }, true);
    expect(localStorage.getItem('aui-auth')).not.toBeNull();
    expect(getStoredUser()).toEqual({ fullName: 'Test User' });
  });

  test('without remember me the user is kept only for the session', () => {
    storeAuth({ fullName: 'Test User' }, false);
    expect(localStorage.getItem('aui-auth')).toBeNull();
    expect(getStoredUser()).toEqual({ fullName: 'Test User' });
  });

  test('clearStoredAuth removes the cached user', () => {
    storeAuth({ fullName: 'Test User' }, true);
    clearStoredAuth();
    expect(getStoredUser()).toBeNull();
  });
});
