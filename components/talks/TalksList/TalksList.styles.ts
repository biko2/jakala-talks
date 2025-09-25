import styled from 'styled-components'

export const Container = styled.main`
  width: 100%;
`;

export const Header = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
  padding-left: 4px;
`;

export const List = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  max-height: 600px;
`;
