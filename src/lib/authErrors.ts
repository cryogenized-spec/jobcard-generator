export function formatAuthError(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return 'Something went wrong. Please try again.';
  }

  const message = String(error.message).toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }

  if (message.includes('password should be at least')) {
    return 'Password is too short. Please use at least 6 characters.';
  }

  if (message.includes('user already registered')) {
    return 'That email is already registered. Please sign in instead.';
  }

  return String(error.message);
}
