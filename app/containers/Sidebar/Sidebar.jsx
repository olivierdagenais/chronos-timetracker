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
import SidebarHeader from './SidebarHeader';
import SidebarSearch from './SidebarSearch';
import SidebarFilters from './SidebarFilters/SidebarFilters';
import SidebarItems from './SidebarItems/SidebarItems';

import {
  SidebarNothingSelected,
  SidebarContainer,
  SidebarList,
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
    <SidebarHeader
      sidebarType={sidebarType}
      setSidebarType={setSidebarType}
    />
    <SidebarList>
      {sidebarType === 'all' &&
        <SidebarSearch />
      }
      {sidebarFiltersOpen &&
        <SidebarFilters />
      }
      {(selectedProjectId || projectsFetching) ?
        <SidebarItems /> :
        <SidebarNothingSelected>
          <span>Select project from dropdown above</span>
        </SidebarNothingSelected>
      }
    </SidebarList>
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
