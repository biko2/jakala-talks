import styled from 'styled-components'

export const Container = styled.div`
  width: 100%;
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
`

export const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

export const Logo = styled.img`
  height: 80px;
  margin: 20px;
  width: auto;
  
  @media (max-width: 768px) {
    height: 50px;
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
  justify-content: space-between;
`;

export const InfoSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px;
  display: flex; 
  flex-direction: column;
  align-items: center;
  gap: 16px;

  @media (min-width: 768px) {
    justify-content: space-between;
    align-items: center;
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
