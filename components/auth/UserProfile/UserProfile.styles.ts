import styled from 'styled-components'

export const ProfileContainer = styled.div`
  background-color: #ffffff;
  border: 1px solid #747775;
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.30), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  padding: 24px;
  transition: box-shadow 0.218s;

  &:hover {
    box-shadow: 0 2px 4px 0 rgba(60, 64, 67, 0.30), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
  }
`

export const ProfileContent = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
`

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

export const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`

export const UserName = styled.h3`
  margin: 0;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: #1f1f1f;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const LogoutButton = styled.button`
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-appearance: none;
  background-color: #ea4335;
  background-image: none;
  border: 1px solid #d93025;
  border-radius: 4px;
  box-sizing: border-box;
  color: #ffffff;
  cursor: pointer;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  height: 40px;
  letter-spacing: 0.25px;
  outline: none;
  overflow: hidden;
  padding: 0 16px;
  position: relative;
  text-align: center;
  transition: background-color 0.218s, border-color 0.218s, box-shadow 0.218s;
  vertical-align: middle;
  white-space: nowrap;
  min-width: min-content;

  &:disabled {
    cursor: default;
    background-color: #ea433561;
    border-color: #ea43351f;
    color: #ffffff61;
  }

  &:not(:disabled):hover {
    background-color: #d93025;
    box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.30), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  }

  &:not(:disabled):active {
    background-color: #b52d20;
  }
`

export const StateLayer = styled.div`
  transition: opacity 0.218s;
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
  background-color: #ffffff;

  ${LogoutButton}:not(:disabled):active &,
  ${LogoutButton}:not(:disabled):focus & {
    opacity: 0.12;
  }

  ${LogoutButton}:not(:disabled):hover & {
    opacity: 0.08;
  }
`
