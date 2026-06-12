export interface SupportRecord {
  id: string;
  normalized_question: string;
  support_answer: string;
  category: string;
  tags: string[];
}

/**
 * Local knowledge base of previously resolved support tickets.
 * Used to ground the assistant's answers with relevant prior context.
 */
export const records: SupportRecord[] = [
  {
    id: 'kb-001',
    normalized_question: 'how do i add a new team member',
    support_answer:
      'To add a new team member, go to Settings → Team → Members and click "Invite member". Enter their email address, choose a role (Admin, Member, or Viewer), and send the invitation. They will receive an email with a link to join your workspace.',
    category: 'Team Management',
    tags: ['team', 'member', 'invite', 'add', 'user', 'role'],
  },
  {
    id: 'kb-002',
    normalized_question: 'how do i reset my password',
    support_answer:
      'To reset your password, click "Forgot password?" on the sign-in page and enter your account email. You will receive a reset link that is valid for 30 minutes. If you do not see the email, check your spam folder or contact support.',
    category: 'Account',
    tags: ['password', 'reset', 'forgot', 'login', 'account', 'security'],
  },
  {
    id: 'kb-003',
    normalized_question: 'how do i upgrade my plan',
    support_answer:
      'You can upgrade your plan from Settings → Billing → Plan. Select the plan you want and confirm. Upgrades take effect immediately and you will be charged a prorated amount for the remainder of your billing cycle.',
    category: 'Billing',
    tags: ['upgrade', 'plan', 'billing', 'subscription', 'pricing', 'payment'],
  },
  {
    id: 'kb-004',
    normalized_question: 'how do i cancel my subscription',
    support_answer:
      'To cancel your subscription, go to Settings → Billing → Plan and click "Cancel subscription". Your plan stays active until the end of the current billing period, after which your account reverts to the free tier. No data is deleted.',
    category: 'Billing',
    tags: ['cancel', 'subscription', 'billing', 'refund', 'downgrade'],
  },
  {
    id: 'kb-005',
    normalized_question: 'how do i export my data',
    support_answer:
      'To export your data, open Settings → Data & Privacy → Export. Choose the format (CSV or JSON) and click "Request export". Larger exports are processed in the background and a download link is emailed to you when ready.',
    category: 'Data',
    tags: ['export', 'data', 'download', 'backup', 'csv', 'json'],
  },
  {
    id: 'kb-006',
    normalized_question: 'how do i enable two factor authentication',
    support_answer:
      'Enable two-factor authentication in Settings → Security → Two-factor authentication. Scan the QR code with an authenticator app such as Google Authenticator or Authy, then enter the 6-digit code to confirm. Save your backup codes in a safe place.',
    category: 'Security',
    tags: ['2fa', 'two-factor', 'authentication', 'security', 'mfa', 'authenticator'],
  },
  {
    id: 'kb-007',
    normalized_question: 'how do i contact support',
    support_answer:
      'You can reach our support team by emailing support@example.com or by using the in-app chat. Our standard response time is under 24 hours on business days. Priority support is available on Pro and Enterprise plans.',
    category: 'Support',
    tags: ['contact', 'support', 'help', 'email', 'chat'],
  },
  {
    id: 'kb-008',
    normalized_question: 'how do i change my email address',
    support_answer:
      'To change your email address, go to Settings → Account → Email and enter your new address. We will send a verification link to the new email; the change is applied once you confirm it.',
    category: 'Account',
    tags: ['email', 'change', 'account', 'address', 'update'],
  },
  {
    id: 'kb-009',
    normalized_question: 'why am i being charged twice',
    support_answer:
      'Duplicate charges are usually a temporary authorization hold that clears within 3-5 business days. If a second charge still appears after that, send the transaction IDs to billing@example.com and we will investigate and refund any genuine duplicate.',
    category: 'Billing',
    tags: ['charge', 'double', 'duplicate', 'refund', 'billing', 'payment'],
  },
  {
    id: 'kb-010',
    normalized_question: 'how do i delete my account',
    support_answer:
      'To permanently delete your account, go to Settings → Account → Delete account. This action is irreversible and removes all of your data after a 14-day grace period. Export anything you want to keep before confirming.',
    category: 'Account',
    tags: ['delete', 'account', 'remove', 'close', 'data'],
  },
];
