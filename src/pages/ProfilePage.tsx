import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, changePasswordSchema, type ProfileFormData, type ChangePasswordFormData } from '@/lib/validations';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { supabase } from '@/services/supabase';

export default function ProfilePage() {
  const { user, profile, updateProfile, updatePassword, signOut } = useAuth();
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name || '',
      mobile: profile?.mobile || '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileMsg('');
    const result = await updateProfile({
      full_name: data.full_name,
      mobile: data.mobile || null,
    });
    setProfileMsg(result.error ? `Error: ${result.error}` : 'Profile updated successfully');
  };

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    setPasswordMsg('');
    const result = await updatePassword(data.newPassword);
    setPasswordMsg(result.error ? `Error: ${result.error}` : 'Password updated successfully');
    if (!result.error) passwordForm.reset();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      await signOut();
    } catch (err) {
      console.error('Delete account error:', err);
    }
    setDeleting(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account settings</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Profile Info */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Information</h2>
          {profileMsg && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${profileMsg.startsWith('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
              {profileMsg}
            </div>
          )}
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field bg-gray-50 dark:bg-gray-800" value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input className="input-field" {...profileForm.register('full_name')} />
              {profileForm.formState.errors.full_name && (
                <p className="error-text">{profileForm.formState.errors.full_name.message}</p>
              )}
            </div>
            <div>
              <label className="label">Mobile Number</label>
              <input className="input-field" {...profileForm.register('mobile')} />
              {profileForm.formState.errors.mobile && (
                <p className="error-text">{profileForm.formState.errors.mobile.message}</p>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Change Password</h2>
          {passwordMsg && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${passwordMsg.startsWith('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
              {passwordMsg}
            </div>
          )}
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input-field" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="error-text">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input-field" {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword && (
                <p className="error-text">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input-field" {...passwordForm.register('confirmPassword')} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="error-text">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="card border-red-200 dark:border-red-900/50">
          <h2 className="mb-2 text-lg font-semibold text-red-600">Danger Zone</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button onClick={() => setShowDeleteDialog(true)} className="btn-danger">
            Delete Account
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This will permanently delete your account, all your data, receipts, and cannot be undone. Are you absolutely sure?"
        confirmLabel="Yes, delete my account"
        loading={deleting}
      />
    </div>
  );
}
