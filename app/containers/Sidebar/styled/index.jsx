import styled from 'styled-components2';

export const RadioContainer = styled.div`
  width: 50%;
  display: inline-block;
`;

export const TabIcon = styled.img`
  height: 14px;
  margin-right: 5px;
`;

export const SidebarNothingSelected = styled.span`
  text-align: center;
  color: rgba(0, 0, 0, 0.67);
  margin-top: 25px;
`;

export const SidebarContainer = styled.div`
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  max-width: 435px;
  background: #fff;
`;

export const SidebarList = styled.div`
  display: flex;
  flex-flow: column nowrap;
  word-break: normal;
  word-wrap: break-word;
  position: relative;
  list-style: none;
  margin: 0;
  height: 100%;
`;
