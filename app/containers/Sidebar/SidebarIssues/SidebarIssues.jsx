// @flow
import React from 'react';
import {
  connect,
} from 'react-redux';
import {
  bindActionCreators,
} from 'redux';
import {
  InfiniteLoader,
  AutoSizer,
  List,
} from 'react-virtualized';

import type {
  StatelessFunctionalComponent,
  Node,
} from 'react';

import {
  getSidebarIssues,
  getProjectsFetching,
  getIssuesFetching,
  getIssuesSearching,
  getIssuesTotalCount,
  getSelectedIssueId,
  getTrackingIssueId,
} from 'selectors';
import {
  IssueItemPlaceholder,
} from 'components';
import {
  issuesActions,
} from 'actions';
import type {
  IssuesMap,
  FetchIssuesRequest,
  SelectIssue,
  Issue,
  Id,
} from '../../../types';
import {
  ListContainer,
} from './styled';

import IssuesHeader from './IssuesHeader';
import IssueItem from './IssueItem';


type Props = {
  issues: IssuesMap,
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
  issues,
  fetching,
  projectsFetching,
  searching,
  totalCount,
  selectedIssueId,
  trackingIssueId,
  fetchIssuesRequest,
  selectIssue,
}: Props): Node =>
  <ListContainer>
    <IssuesHeader />
    <InfiniteLoader
      isRowLoaded={({ index }) => !!issues[index]}
      rowCount={totalCount}
      minimumBatchSize={50}
      threshold={20}
      loadMoreRows={({ startIndex, stopIndex }) =>
        new Promise((resolve) => {
          fetchIssuesRequest({
            startIndex,
            stopIndex,
            resolve,
            search: false,
          });
        })
      }
    >
      {({
        onRowsRendered,
        registerChild,
      }) => (
        <AutoSizer>
          {({ height, width }) => (
            <List
              width={width}
              height={height - 39}
              registerChild={registerChild}
              onRowsRendered={onRowsRendered}
              scrollToAlignment="center"
              rowCount={(totalCount === 0 && (fetching || projectsFetching)) ? 10 : totalCount}
              rowHeight={101}
              rowRenderer={({ index, key, style }) => {
                const item: ?Issue = issues[index];
                if (searching && (fetching || projectsFetching)) {
                  return <IssueItemPlaceholder key={key} />;
                }
                return (
                  <div style={style} key={key}>
                    {item
                      ? <IssueItem
                        issue={item}
                        active={selectedIssueId === item.id}
                        tracking={trackingIssueId === item.id}
                        selectIssue={selectIssue}
                      />
                      : <IssueItemPlaceholder />
                      }
                  </div>
                );
              }}
            />
          )}
        </AutoSizer>
      )}
    </InfiniteLoader>
  </ListContainer>;

function mapStateToProps(state) {
  return {
    issues: getSidebarIssues(state),
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
