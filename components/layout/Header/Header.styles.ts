import styled from 'styled-components'

export const Container = styled.div`
  width: 100%;
  padding: 16px 0px;
  position: relative;
  max-width: 1440px;
  margin: 0 auto;

  @media (max-width: 768px) {
    margin: 0;
  }
`

export const Banner = styled.div`
  background: var(--color-primary);
  color: white;
  text-align: center;
  padding: 10px;
`

export const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    margin: 0;
  }
`

export const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

export const LogoRow = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 16px;
  padding: 8px 0;

  @media (max-width: 768px) {
    justify-content: space-around;
  }
`

export const Logo = styled.img`
  height: 96px;
  width: auto;
  
  @media (max-width: 768px) {
    height: 48px;
  }
`

export const OpenSpaceLink = styled.a`
  position: absolute;
  right: 0;
  color: white;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-raleway), system-ui, sans-serif;
  text-decoration: none;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: rgb(240, 10, 10);
  }

  @media (max-width: 768px) {
    position: static;
    margin-top: 8px;
  }
`

export const Subtitle = styled.div`
  font-size: 18px;
  opacity: 0.9;
  font-weight: 300;
`

export const SecondLine = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  margin: 0 auto;
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const ThirdLine = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background-color: rgb(221, 228, 233);
  color: rgb(32, 49, 75);
  padding: 32px;
  border-radius: 12px;
  margin: 0px 24px 32px;
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  width: 100%;

  span {
    display: block;
    font-size: 16px;
    line-height: 24px;
    color: rgb(32, 49, 75);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 24px 16px;
    margin: 0px 16px 24px;
    gap: 16px;
    text-align: center;
  }
`;

export const InfoSection = styled.div`
  max-width: 1024px;
  margin: 0 auto;
  padding: 0px 56px;
  display: flex; 
  flex-direction: column;
  align-items: center;
  gap: 16px;

  @media (min-width: 768px) {
    justify-content: space-between;
    align-items: center;
  }

  @media (max-width: 768px) {
    padding: 0;
  }
`

export const MainTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px 0;
  text-align: center;

  @media (min-width: 768px) {
    text-align: left;
  }
`

export const LeftSection = styled.div`
  display: flex;
  flex-direction: column;
`

export const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-end;
  }
`
