import styled, { css } from 'styled-components'

type GoogleTheme = 'light' | 'dark' | 'neutral'
type GoogleIconSize = 'large' | 'medium' | 'small'

interface ButtonProps {
  $theme: GoogleTheme
  $size: GoogleIconSize
}

const getThemeStyles = (theme: GoogleTheme) => {
  switch (theme) {
    case 'light':
      return css`
        background: #FFFFFF;
        border: 1px solid #747775;
        
        &:hover:not(:disabled) {
          background: #F8F9FA;
          box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
        }
        
        &:focus {
          background: #F8F9FA;
          box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
          outline: 2px solid #4285F4;
          outline-offset: 2px;
        }
        
        &:active:not(:disabled) {
          background: #F1F3F4;
          box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
        }
      `
    case 'dark':
      return css`
        background: #131314;
        border: 1px solid #8E918F;
        
        &:hover:not(:disabled) {
          background: #2D2E30;
          box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.15);
        }
        
        &:focus {
          background: #2D2E30;
          box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.15);
          outline: 2px solid #4285F4;
          outline-offset: 2px;
        }
        
        &:active:not(:disabled) {
          background: #1C1D1F;
          box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.15);
        }
      `
    case 'neutral':
      return css`
        background: #F2F2F2;
        border: none;
        
        &:hover:not(:disabled) {
          background: #E8E8E8;
          box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
        }
        
        &:focus {
          background: #E8E8E8;
          box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
          outline: 2px solid #4285F4;
          outline-offset: 2px;
        }
        
        &:active:not(:disabled) {
          background: #DADADA;
          box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.15);
        }
      `
  }
}

const getSizeStyles = (size: GoogleIconSize) => {
  switch (size) {
    case 'large':
      return css`
        width: 44px;
        height: 44px;
        padding: 12px;
      `
    case 'medium':
      return css`
        width: 36px;
        height: 36px;
        padding: 9px;
      `
    case 'small':
      return css`
        width: 28px;
        height: 28px;
        padding: 5px;
      `
  }
}

const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  user-select: none;
  
  ${props => getThemeStyles(props.$theme)}
  ${props => getSizeStyles(props.$size)}
  
  &:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }
`

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
`

export const GoogleIconStyles = {
  Button,
  IconContainer
}
