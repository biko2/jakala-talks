import styled from 'styled-components'

export const AvatarContainer = styled.div`
  flex-shrink: 0;
  position: relative;
`

export const Avatar = styled.img`
  height: 48px;
  width: 48px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  object-fit: cover;
  transition: border-color 0.218s;

  &:hover {
    border-color: #9ca3af;
  }
`
