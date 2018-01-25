// @flow
import React from 'react';
import type { StatelessFunctionalComponent, Node } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  getSidebarIssues,
  getProjectsFetching,
  getIssuesFetching,
  getIssuesSearching,
  getIssuesTotalCount,
  getSelectedIssueId,
  getTrackingIssueId,
} from 'selectors';
import { InfiniteLoadingList, IssueItemPlaceholder } from 'components';
import { issuesActions } from 'actions';

import SidebarItem from './SidebarItem';
import type {
  IssuesMap,
  FetchIssuesRequest,
  SelectIssue,
  Issue,
  Id,
} from '../../../types';

type Props = {
  items: IssuesMap,
  fetching: boolean,
  projectsFetching: boolean,
  searching: boolean,
  totalCount: number,
  selectedIssueId: Id | null,
  trackingIssueId: Id | null,
  fetchIssuesRequest: FetchIssuesRequest,
  selectIssue: SelectIssue,
};

const SidebarAllItems: StatelessFunctionalComponent<Props> = ({
  items,
  fetching,
  projectsFetching,
  searching,
  totalCount,
  selectedIssueId,
  trackingIssueId,
  fetchIssuesRequest,
  selectIssue,
}: Props): Node =>
  <InfiniteLoadingList
    isRowLoaded={({ index }) => !!items[index]}
    minimumBatchSize={50}
    threshold={20}
    loadMoreRows={(data) => {
      const promise = new Promise((resolve) => {
        fetchIssuesRequest({ ...data, search: false });
        resolve();
      });
      return promise;
    }}
    rowCount={totalCount}
    listProps={{
      autoSized: true,
      // scrollToIndex: selectedIssueIndex,
      scrollToAlignment: 'center',
      rowCount: (totalCount === 0 && (fetching || projectsFetching)) ? 10 : totalCount,
      rowHeight: 101,
      // eslint-disable-next-line react/prop-types
      rowRenderer: ({ index, key, style }) => {
        const item: ?Issue = items[index];
        if (searching && (fetching || projectsFetching)) {
          return <IssueItemPlaceholder key={key} />;
        }
        return (
          <div style={style} key={key}>
            {item
              ? <SidebarItem
                issue={item}
                active={selectedIssueId === item.id}
                tracking={trackingIssueId === item.id}
                selectIssue={selectIssue}
              />
              : <IssueItemPlaceholder />
              }
          </div>
        );
      },
    }}
  />;

function mapStateToProps(state) {
  return {
    items: getSidebarIssues(state),
    fetching: getIssuesFetching(state),
    projectsFetching: getProjectsFetching(state),
    searching: getIssuesSearching(state),
    totalCount: getIssuesTotalCount(state),
    selectedIssueId: getSelectedIssueId(state),
    trackingIssueId: getTrackingIssueId(state),
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(issuesActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SidebarAllItems);
