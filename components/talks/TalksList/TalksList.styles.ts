import styled from 'styled-components'

export const Container = styled.main`
  width: 100%;
`;

export const EmptyTalksListHeader = styled.h2`
  font-size: 30px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  justify-content: center;
`;

export const Header = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
  padding-left: 4px;
`;

export const VotingStatus = styled.div`
  background: #dbeafe;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 12px 16px;
  color: #1e40af;
  font-weight: 500;
  text-align: center;
  margin-bottom: 16px;
`;

export const List = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  width: 100%;
  max-height: 600px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }
`;
