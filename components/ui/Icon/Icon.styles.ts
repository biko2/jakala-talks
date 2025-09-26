import styled from 'styled-components'

export const IconContainer = styled.div<{ $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: opacity 0.2s ease;

  ${props => props.$clickable && `
    &:hover {
      opacity: 0.7;
    }
  `}
`
