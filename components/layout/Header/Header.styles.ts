import styled from 'styled-components'

export const Container = styled.div`
  width: 100%;
`

export const Banner = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 40px 20px;
`

export const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
`

export const Title = styled.h1`
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 8px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    font-size: 36px;
    flex-direction: column;
    gap: 4px;
  }
`

export const TitlePrimary = styled.span`
  color: white;
`

export const TitleSecondary = styled.span`
  background: white;
  color: #667eea;
  padding: 4px 12px;
  border-radius: 8px;
  font-weight: 800;
`

export const Subtitle = styled.div`
  font-size: 18px;
  opacity: 0.9;
  font-weight: 300;
`

export const InfoSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px;
  display: flex; 
  justify-content: space-between;
`

export const MainTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 16px 0;
`

export const LoginPrompt = styled.div`
  button {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    padding: 8px 16px;
    border: 2px solid #667eea;
    border-radius: 6px;
    transition: all 0.2s ease;
    background: white;
    cursor: pointer;
    
    &:hover {
      background: #667eea;
      color: white;
    }
  }
`

export const LoginFormContainer = styled.div`
  margin-top: 24px;
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 400px;
`;
