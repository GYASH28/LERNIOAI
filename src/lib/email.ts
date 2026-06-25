import 'server-only';

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${baseUrl}/api/auth/verify-email/confirm?token=${token}`;
  console.log('========================================');
  console.log(`[MOCK EMAIL] Verification Email for ${email}`);
  console.log(`Link: ${url}`);
  console.log('========================================');
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${baseUrl}/reset-password?token=${token}`;
  console.log('========================================');
  console.log(`[MOCK EMAIL] Password Reset Email for ${email}`);
  console.log(`Link: ${url}`);
  console.log('========================================');
}
