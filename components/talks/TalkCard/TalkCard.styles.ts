import styled from 'styled-components'

export const Container = styled.div<{ $isClickable?: boolean }>`
  background: white;
  border-radius: 16px;
  padding: 35px 25px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: ${props => props.$isClickable ? 'pointer' : 'default'};
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb;
  opacity: 1;
  height: 480px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: ${props => props.$isClickable ? 'translateY(-2px)' : 'none'};
    box-shadow: ${props => props.$isClickable ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)'};
  }

  @media (max-width: 768px) {
    height: 600px;
  }
`

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`

export const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.3;
  flex: 1;
  margin-right: 16px;
`

export const VoteWrapper = styled.div <{ $isVoted: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${props => props.$isVoted ? '#f00a0a' : '#e5e7eb'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.$isVoted ? 'white' : '#6b7280'};
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;

  &:hover {
    transform: scale(1.05);
    background-color: ${props => props.$isVoted ? '#d00909' : '#d1d5db'};
  }
`

export const Description = styled.div`
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 20px;
  font-size: 14px;
  flex: 1;
`

export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
`

export const Author = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const AuthorIcon = styled.div`
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

export const AuthorName = styled.div`
  font-weight: 500;
  color: #374151;
  font-size: 14px;
`

export const Duration = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const DurationIcon = styled.div`
  font-size: 14px;
`

export const DurationText = styled.div`
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
`

export const VotesCount = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 16px;
  color: #374151;
  text-align: center;
`
