import styled from 'styled-components'

export const NewTalkButton = styled.button`
  background-color: var(--color-secondary);
  color: white;
  border: none;
  border-radius: 8px;
  width: 56px;
  height: 56px;
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--color-secondary) 85%, black);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  &:focus {
    outline: 2px solid var(--color-secondary);
    outline-offset: 2px;
  }
`
