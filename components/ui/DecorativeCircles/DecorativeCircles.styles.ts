import styled from 'styled-components'

export const Circle = styled.div<{
  $size?: number
  $right?: number
  $bottom?: number
}>`
  box-shadow: 0 1px 3px #0000000a, 0 1px 1px #00000014, 0 2px 1px -1px #00000029;

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
