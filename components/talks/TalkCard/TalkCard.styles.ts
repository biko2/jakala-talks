import styled from 'styled-components'

const Container = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.3;
  flex: 1;
  margin-right: 16px;
`

const VoteIcon = styled.div<{ $isVoted: boolean }>`
  font-size: 20px;
  opacity: ${props => props.$isVoted ? 1 : 0.3};
  transition: opacity 0.2s ease;
  
  ${Container}:hover & {
    opacity: ${props => props.$isVoted ? 1 : 0.7};
  }
`

const Description = styled.div`
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 20px;
  font-size: 14px;
`

const Author = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const AuthorIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 2px solid #e5e7eb;
`

const AuthorName = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 14px;
`

export const TalkCardStyles = {
  Container,
  Header,
  Title,
  VoteIcon,
  Description,
  Author,
  AuthorIcon,
  AuthorName
}
