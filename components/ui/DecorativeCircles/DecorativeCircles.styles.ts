import styled from 'styled-components'

export const Circle = styled.div<{
  $size?: number
  $right?: number
  $bottom?: number
}>`
  -webkit-box-shadow: 1px 1px 5px 1px rgba(0,0,0,0.47); 
  box-shadow: 1px 1px 5px 1px rgba(0,0,0,0.47);

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
