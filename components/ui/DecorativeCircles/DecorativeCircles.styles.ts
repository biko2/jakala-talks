import styled from 'styled-components'

export const Circle = styled.div<{
  $size?: number
  $right?: number
  $bottom?: number
}>`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border-radius: 50%;
  background-color: #fa000a;
  opacity: 1;
  right: ${props => props.$right}%;
  bottom: ${props => props.$bottom}%;
  pointer-events: none;
  z-index: 1;
`
