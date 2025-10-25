import { renderHook, act } from '@testing-library/react';
import { usePreviousSignIn } from '../src/hooks/usePreviousSignIn';

describe('usePreviousSignIn', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('returns false by default when no flag is stored', () => {
    const { result } = renderHook(() => usePreviousSignIn());
    expect(result.current.hasSignedInBefore).toBe(false);
  });

  it('returns true if localStorage contains the flag', () => {
    localStorage.setItem('seamlessauth_seen', 'true');
    const { result } = renderHook(() => usePreviousSignIn());
    expect(result.current.hasSignedInBefore).toBe(true);
  });

  it('marks signed in and persists to localStorage', () => {
    const { result } = renderHook(() => usePreviousSignIn());
    expect(result.current.hasSignedInBefore).toBe(false);

    act(() => {
      result.current.markSignedIn();
    });

    expect(result.current.hasSignedInBefore).toBe(true);
    expect(localStorage.getItem('seamlessauth_seen')).toBe('true');
  });

  it('handles storage errors gracefully', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    const { result } = renderHook(() => usePreviousSignIn());
    expect(() => result.current.markSignedIn()).not.toThrow();
    setItemSpy.mockRestore();
  });

  it('supports a custom storage key', () => {
    const { result } = renderHook(() => usePreviousSignIn('custom_key'));
    act(() => {
      result.current.markSignedIn();
    });
    expect(localStorage.getItem('custom_key')).toBe('true');
  });
});
