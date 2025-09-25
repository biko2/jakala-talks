import styled from 'styled-components'


export const OfficialButton = styled.button`
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-appearance: none;
  background-color: #ffffff;
  background-image: none;
  border: 1px solid #747775;
  border-radius: 4px;
  box-sizing: border-box;
  color: #1f1f1f;
  cursor: pointer;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 14px;
  height: 40px;
  letter-spacing: 0.25px;
  outline: none;
  overflow: hidden;
  padding: 0 12px;
  position: relative;
  text-align: center;
  transition: background-color 0.218s, border-color 0.218s, box-shadow 0.218s;
  vertical-align: middle;
  white-space: nowrap;
  width: auto;
  max-width: 400px;
  min-width: min-content;

  &:disabled {
    cursor: default;
    background-color: #ffffff61;
    border-color: #1f1f1f1f;
  }

  &:not(:disabled):hover {
    box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.30), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  }
`

export const OfficialStateLayer = styled.div`
  transition: opacity 0.218s;
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
  background-color: #303030;

  ${OfficialButton}:not(:disabled):active &,
  ${OfficialButton}:not(:disabled):focus & {
    opacity: 0.12;
  }

  ${OfficialButton}:not(:disabled):hover & {
    opacity: 0.08;
  }
`

export const OfficialContentWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  height: 100%;
  justify-content: space-between;
  position: relative;
  width: 100%;
`

export const OfficialIconContainer = styled.div`
  height: 20px;
  margin-right: 12px;
  min-width: 20px;
  width: 20px;

  ${OfficialButton}:disabled & {
    opacity: 0.38;
  }
`

export const OfficialButtonContents = styled.span`
  flex-grow: 1;
  font-family: 'Roboto', arial, sans-serif;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;

  ${OfficialButton}:disabled & {
    opacity: 0.38;
  }
`