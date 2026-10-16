/**
 * Account Deletion page — required by Google Play for apps that support account creation.
 * Explains how to delete your PaceCue account and what data is removed.
 */

import { renderPage } from '../layout';

export function deleteAccountPage(): string {
  return renderPage(
    {
      title: 'Delete Your Account — PaceCue',
      description:
        'Learn how to permanently delete your PaceCue account and all associated data, including workouts, run history, and running profile.',
      path: '/delete-account',
    },
    `
    <section class="page-header">
      <h1>Delete Your Account</h1>
      <p>How to permanently delete your PaceCue account and all associated data.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>How to Delete Your Account</h2>
        <p>You can delete your PaceCue account directly from the app:</p>
        <ol>
          <li>Open <strong>PaceCue</strong> on your device.</li>
          <li>Go to the <strong>Settings</strong> tab.</li>
          <li>Scroll down and tap <strong>Delete Account</strong>.</li>
          <li>Confirm the deletion when prompted.</li>
        </ol>

        <h2>What Gets Deleted</h2>
        <p>When you delete your account, the following data is <strong>permanently removed</strong> from our servers:</p>
        <ul>
          <li>Your user profile and authentication credentials</li>
          <li>All saved workouts and custom interval plans</li>
          <li>Your complete run history and per-interval splits</li>
          <li>AI conversation history and generated workouts</li>
          <li>Your running profile (race times, experience level, preferences)</li>
          <li>Training plans and progress</li>
          <li>Shared workout links</li>
        </ul>

        <h2>What Is Not Affected</h2>
        <p>Local data stored on your device (such as cached workouts) is not automatically removed when you delete your account. You can remove this by uninstalling the app.</p>

        <h2>Account Deletion Is Permanent</h2>
        <p>This action <strong>cannot be undone</strong>. Once your account is deleted, all cloud data is permanently erased and cannot be recovered. If you decide to use PaceCue again, you will need to create a new account.</p>

        <h2>Need Help?</h2>
        <p>If you are unable to access the app and need to delete your account, contact us at <a href="mailto:brandon@getsurmount.com">brandon@getsurmount.com</a> with the email address associated with your account, and we will process the deletion for you.</p>
      </div>
    </section>
    `,
  );
}
