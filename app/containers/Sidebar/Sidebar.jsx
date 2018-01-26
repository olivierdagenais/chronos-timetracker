// @flow
import React from 'react';
import {
  connect,
} from 'react-redux';
import {
  bindActionCreators,
} from 'redux';

import type {
  StatelessFunctionalComponent,
  Node,
} from 'react';

import {
  uiActions,
} from 'actions';
import {
  getProjectsFetching,
  getSidebarType,
  getSelectedProjectId,
  getSidebarFiltersOpen,
} from 'selectors';

import ProjectPicker from './ProjectPicker';
import SidebarSearch from './SidebarSearch';
import SidebarFilters from './SidebarFilters/SidebarFilters';
import SidebarItems from './SidebarItems/SidebarItems';
import SidebarIssues from './SidebarIssues'
import SidebarAllItems from './SidebarItems/SidebarAllItems';
import SidebarRecentItems from './SidebarRecentItems';

import {
  SidebarNothingSelected,
  SidebarContainer,
  TabContainer,
  ListContainer,
  Tab,
} from './styled';

import type {
  SetSidebarType,
  SidebarType,
  Id,
} from '../../types';


type Props = {
  projectsFetching: boolean,
  sidebarType: SidebarType,
  setSidebarType: SetSidebarType,
  selectedProjectId: Id | null,
  sidebarFiltersOpen: boolean,
};

const Sidebar: StatelessFunctionalComponent<Props> = ({
  projectsFetching,
  sidebarType,
  setSidebarType,
  selectedProjectId,
  sidebarFiltersOpen,
}: Props): Node => (
  <SidebarContainer>
    <ProjectPicker />
    <TabContainer>
      <Tab
        active={sidebarType === 'recent'}
        onClick={() => setSidebarType('recent')}
      >
        Recent worklogs
      </Tab>
      <Tab
        active={sidebarType === 'all'}
        onClick={() => setSidebarType('all')}
      >
        Issues
      </Tab>
    </TabContainer>
    <ListContainer>
      <SidebarIssues />
      <SidebarRecentItems />
    </ListContainer>
  </SidebarContainer>
);

function mapStateToProps(state) {
  return {
    projectsFetching: getProjectsFetching(state),
    sidebarType: getSidebarType(state),
    selectedProjectId: getSelectedProjectId(state),
    sidebarFiltersOpen: getSidebarFiltersOpen(state),
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(uiActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Sidebar);
