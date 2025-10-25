import { render, screen } from '@testing-library/react';
import {
  InternalAuthProvider,
  useInternalAuth,
} from '../src/context/InternalAuthContext';

const TestComponent = () => {
  const { validateToken } = useInternalAuth();
  return <button onClick={validateToken}>Run Validate</button>;
};

describe('InternalAuthContext', () => {
  it('provides context values to consumers', () => {
    const mockValidateToken = jest.fn().mockResolvedValue(undefined);
    const mockSetLoading = jest.fn();

    render(
      <InternalAuthProvider
        value={{
          validateToken: mockValidateToken,
          setLoading: mockSetLoading,
        }}
      >
        <TestComponent />
      </InternalAuthProvider>
    );

    const button = screen.getByRole('button', { name: /Run Validate/i });
    button.click();

    expect(mockValidateToken).toHaveBeenCalledTimes(1);
  });

  it('throws error when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrowError(
      'useInternalAuth must be used within InternalAuthProvider'
    );

    spy.mockRestore();
  });
});
