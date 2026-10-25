/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import { SeamlessAuthError } from '@seamless-auth/client';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { useAuth } from '@/AuthProvider';
import { useAuthClient } from '@/hooks/useAuthClient';
import { usePasskeySupport } from '@/hooks/usePasskeySupport';
import { AccountSecurity } from '@/components/AccountSecurity';
import { PasskeyManagement } from '@/components/PasskeyManagement';
import { RecoveryCodeSettings } from '@/components/RecoveryCodeSettings';
import { RecoveryRequests } from '@/components/RecoveryRequests';

jest.mock('@/AuthProvider');
jest.mock('@/hooks/useAuthClient');
jest.mock('@/hooks/usePasskeySupport');

const failure = (status: number, body: unknown = {}) => ({
  data: null,
  error: new SeamlessAuthError('failed', status, body),
});
const success = <T,>(data: T) => ({ data, error: null });

const passkey = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  createdAt: '2026-10-01T00:00:00.000Z',
  counter: 0,
  backedup: false,
  backedUp: false,
  friendlyName: `Key ${id}`,
  lastUsedAt: null,
  ...extra,
});

const client = {
  getRecoveryCodeStatus: jest.fn(),
  generateRecoveryCodes: jest.fn(),
  listAccountRecoveryRequests: jest.fn(),
  cancelAccountRecoveryRequest: jest.fn(),
};
let auth: Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  auth = {
    credentials: [],
    updateCredential: jest.fn().mockResolvedValue(success({})),
    deleteCredential: jest.fn().mockResolvedValue(success({ message: 'ok' })),
    registerPasskey: jest.fn().mockResolvedValue(success({ credentialId: 'n' })),
    verifyStepUpWithPasskey: jest.fn().mockResolvedValue(success({ fresh: true })),
  };
  (useAuth as jest.Mock).mockImplementation(() => auth);
  (useAuthClient as jest.Mock).mockReturnValue(client);
  (usePasskeySupport as jest.Mock).mockReturnValue({
    passkeySupported: true,
    loading: false,
  });
});

describe('PasskeyManagement', () => {
  it('lists passkeys with their type and last use, and asks for a second one', () => {
    auth.credentials = [
      passkey('1', {
        deviceType: 'multiDevice',
        lastUsedAt: '2026-10-20T00:00:00.000Z',
      }),
    ];

    render(<PasskeyManagement />);

    expect(screen.getByText('Key 1')).toBeInTheDocument();
    expect(screen.getByText(/Synced passkey/)).toHaveTextContent(/Last used/);
    expect(screen.getByText(/Add a second/)).toBeInTheDocument();
  });

  it('warns when there are none and says so when the browser cannot add one', () => {
    (usePasskeySupport as jest.Mock).mockReturnValue({
      passkeySupported: false,
      loading: false,
    });

    render(<PasskeyManagement />);

    expect(screen.getByText(/You have no passkeys/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a passkey' })).toBeDisabled();
    expect(screen.getByText(/cannot create passkeys/)).toBeInTheDocument();
  });

  it('renames a passkey, and clears the name when left empty', async () => {
    auth.credentials = [passkey('1'), passkey('2', { transports: ['usb'] })];
    render(<PasskeyManagement />);

    expect(screen.getByText(/Security key/)).toHaveTextContent(/Never used/);
    expect(screen.queryByText(/Add a second/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rename Key 1' }));
    fireEvent.change(screen.getByLabelText('Passkey name'), {
      target: { value: '  Work laptop ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(auth.updateCredential).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', friendlyName: 'Work laptop' })
      )
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Rename Key 2' }));
    fireEvent.change(screen.getByLabelText('Passkey name'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(auth.updateCredential).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: '2', friendlyName: null })
      )
    );
  });

  it('reports a failed rename and can cancel it', async () => {
    auth.credentials = [passkey('1')];
    (auth.updateCredential as jest.Mock).mockResolvedValue(failure(500));
    render(<PasskeyManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename Key 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not rename/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Rename Key 1' })).toBeInTheDocument();
  });

  it('deletes only after confirming, with a stronger warning for the last one', async () => {
    auth.credentials = [passkey('1')];
    render(<PasskeyManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Key 1' }));
    expect(screen.getByText(/only passkey/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(auth.deleteCredential).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Key 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(auth.deleteCredential).toHaveBeenCalledWith('1'));
  });

  it('reports a failed delete', async () => {
    auth.credentials = [passkey('1'), passkey('2')];
    (auth.deleteCredential as jest.Mock).mockResolvedValue(failure(500));
    render(<PasskeyManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Key 2' }));
    expect(screen.getByText('Delete this passkey?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not delete/);
  });

  it('adds another passkey on this device', async () => {
    auth.credentials = [passkey('1')];
    render(<PasskeyManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Add a passkey' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Passkey added.');
    expect(auth.registerPasskey).toHaveBeenCalledWith({
      metadata: expect.objectContaining({ friendlyName: expect.any(String) }),
    });
  });

  it('explains a refused enrollment', async () => {
    (auth.registerPasskey as jest.Mock).mockResolvedValue(
      failure(403, { error: 'synced_passkey_not_allowed' })
    );
    render(<PasskeyManagement />);

    fireEvent.click(screen.getByRole('button', { name: 'Add a passkey' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/password manager/);
  });
});

describe('RecoveryCodeSettings', () => {
  it('shows what is left and replaces the set after a step-up', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(
      success({
        enabled: true,
        remaining: 2,
        total: 10,
        createdAt: '2026-10-01T00:00:00.000Z',
      })
    );
    client.generateRecoveryCodes
      .mockResolvedValueOnce(failure(403, { error: 'step_up_required' }))
      .mockResolvedValueOnce(
        success({ message: 'Success', codes: ['NEW-1'], createdAt: 'x' })
      );

    render(<RecoveryCodeSettings />);

    expect(await screen.findByText(/2 of 10 codes left, created/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replace recovery codes' }));

    expect(await screen.findByText('NEW-1')).toBeInTheDocument();
    expect(auth.verifyStepUpWithPasskey).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/I have saved/));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(client.getRecoveryCodeStatus).toHaveBeenCalledTimes(2));
  });

  it('generates a first set and reports a failed step-up', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(
      success({ enabled: true, remaining: 0, total: 0, createdAt: null })
    );
    client.generateRecoveryCodes.mockResolvedValue(
      failure(403, { error: 'step_up_required' })
    );
    (auth.verifyStepUpWithPasskey as jest.Mock).mockResolvedValue(failure(0));

    render(<RecoveryCodeSettings />);

    expect(await screen.findByText(/no recovery codes yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate recovery codes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Confirm it is you/);
  });

  it('says when recovery codes are off, or cannot be read', async () => {
    client.getRecoveryCodeStatus.mockResolvedValueOnce(
      success({ enabled: false, remaining: 0, total: 0, createdAt: null })
    );
    const { unmount } = render(<RecoveryCodeSettings />);
    expect(await screen.findByText(/turned off/)).toBeInTheDocument();
    unmount();

    client.getRecoveryCodeStatus.mockResolvedValueOnce(failure(500));
    render(<RecoveryCodeSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load/);
  });
});

describe('RecoveryRequests', () => {
  const request = (id: string, state = 'pending') => ({
    id,
    channel: 'email',
    state,
    requestedAt: '2026-10-24T10:00:00.000Z',
    completesAt: '2026-10-25T10:00:00.000Z',
  });

  it('lists open requests and cancels one', async () => {
    client.listAccountRecoveryRequests.mockResolvedValue(
      success({ requests: [request('a'), request('b', 'ready')] })
    );
    client.cancelAccountRecoveryRequest.mockResolvedValue(success({ message: 'ok' }));

    render(<RecoveryRequests />);

    expect(await screen.findByText(/If it was not you/)).toBeInTheDocument();
    expect(screen.getByText(/Can be completed now/)).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    fireEvent.click(within(items[0]).getByRole('button', { name: 'Cancel request' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(client.cancelAccountRecoveryRequest).toHaveBeenCalledWith('a');
  });

  it('reports a failed cancel and an empty list', async () => {
    client.listAccountRecoveryRequests.mockResolvedValueOnce(
      success({ requests: [request('a')] })
    );
    client.cancelAccountRecoveryRequest.mockResolvedValue(
      failure(404, { error: 'recovery_not_found' })
    );
    const { unmount } = render(<RecoveryRequests />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no open recovery request/
    );
    unmount();

    client.listAccountRecoveryRequests.mockResolvedValueOnce(success({ requests: [] }));
    render(<RecoveryRequests />);
    expect(await screen.findByText(/No one is trying/)).toBeInTheDocument();
  });

  it('reports a list that cannot be read', async () => {
    client.listAccountRecoveryRequests.mockResolvedValue(failure(500));

    render(<RecoveryRequests />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load/);
  });
});

describe('AccountSecurity', () => {
  it('renders every section', async () => {
    client.getRecoveryCodeStatus.mockResolvedValue(
      success({ enabled: true, remaining: 10, total: 10, createdAt: null })
    );
    client.listAccountRecoveryRequests.mockResolvedValue(success({ requests: [] }));

    render(<AccountSecurity />);

    expect(screen.getByRole('heading', { name: 'Passkeys' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recovery codes' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Account recovery requests' })
    ).toBeInTheDocument();
    expect(await screen.findByText(/10 of 10 codes left\./)).toBeInTheDocument();
  });
});
