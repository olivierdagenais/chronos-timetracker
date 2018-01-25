// @flow
import React from 'react';
import type { StatelessFunctionalComponent, Node } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { issuesActions } from 'actions';
import { Flex } from 'components';
import {
  getIssuesFetching,
  getProjectsFetching,
  getRecentIssuesFetching,
  getIssuesTotalCount,
  getRecentIssuesTotalCount,
  getSidebarType,
} from 'selectors';

import SidebarNoItems from './SidebarNoItems';
import SidebarAllItems from './SidebarAllItems';
import SidebarRecentItems from '../SidebarRecentItems/SidebarRecentItems';

import type { SidebarType } from '../../../types';

type Props = {
  fetching: boolean,
  projectsFetching: boolean,
  recentFetching: boolean,
  totalCount: number,
  recentTotalCount: number,
  sidebarType: SidebarType,
}

const SidebarItems: StatelessFunctionalComponent<Props> = ({
  fetching,
  projectsFetching,
  recentFetching,
  totalCount,
  recentTotalCount,
  sidebarType,
}: Props): Node =>
  <Flex column style={{ height: '100%' }}>
    {!projectsFetching && !fetching && totalCount === 0 && sidebarType === 'all' &&
      <SidebarNoItems recent={false} />
    }
    {!projectsFetching && !recentFetching && recentTotalCount === 0 && sidebarType === 'recent' &&
      <SidebarNoItems recent />
    }
    <SidebarAllItems />
    <SidebarRecentItems />
  </Flex>;

function mapStateToProps(state) {
  return {
    initializeInProcess: state.ui.initializeInProcess,
    fetching: getIssuesFetching(state),
    projectsFetching: getProjectsFetching(state),
    recentFetching: getRecentIssuesFetching(state),
    totalCount: getIssuesTotalCount(state),
    recentTotalCount: getRecentIssuesTotalCount(state),
    sidebarType: getSidebarType(state),
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(issuesActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SidebarItems);
