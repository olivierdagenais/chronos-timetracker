// @flow
import {
  delay,
} from 'redux-saga';
import {
  call,
  take,
  select,
  put,
  fork,
  takeEvery,
  cancel,
} from 'redux-saga/effects';
import Raven from 'raven-js';
import createActionCreators from 'redux-resource-action-creators';

import * as Api from 'api';

import type {
  Id,
} from 'types';

import {
  getFieldIdByName,
  getUserData,
  getResourceMap,
  getUiState,
  getCurrentProjectId,
  getResourceItemBydId,
} from 'selectors';
import {
  uiActions,
  resourcesActions,
  actionTypes,
} from 'actions';

import {
  throwError,
  infoLog,
  notify,
} from './ui';
import {
  getAdditionalWorklogsForIssues,
} from './worklogs';
import {
  getIssueComments,
} from './comments';
import createIpcChannel from './ipc';
import {
  trackMixpanel,
} from '../utils/stat';


const JQL_RESTRICTED_CHARS_REGEX = /[+.,;?|*/%^$#@[\]]/;

export function transformFilterValue(value: string): string {
  return JQL_RESTRICTED_CHARS_REGEX.test(value) ? `"${value}"` : String(value);
}

/* eslint-disable */
const normalizeIssues = issues => {
  try {
    return issues.reduce((acc, issue) => {
      acc.entities.worklogs =
        issue.fields.worklog.worklogs.reduce(
          (wacc, worklog) => {
            wacc[worklog.id] = worklog;
            return wacc;
          },
          acc.entities.worklogs,
        )
      issue.fields.worklogs = issue.fields.worklog.worklogs.map(w => w.id);
      delete issue.fields.worklog;
      acc.entities.issues[issue.id] = issue;
      acc.result.push(issue.id);
      return acc;
    }, {
      entities: {
        issues: {},
        worklogs: {},
      },
      result: [],
    });
  } catch (err) {
    Raven.captureMessage('normalizedIssues error!', {
      level: 'error',
      extra: {
        issues,
      },
    });
    throw err;
  }
}
/* eslint-enable */

function mapAssignee(assigneeId: string) {
  return assigneeId === 'unassigned' ? 'assignee is EMPTY' : 'assignee = currentUser()';
}

function mapSearchValue(searchValue: string, projectKey: string): string {
  if (searchValue.startsWith(`${projectKey}-`)) {
    return `key = "${searchValue}"`;
  }
  if (/^[0-9]*$/.test(searchValue)) {
    return `(key = "${projectKey}-${searchValue}" OR summary ~ "${searchValue}")`;
  }
  return `summary ~ "${searchValue}"`;
}

function buildJQLQuery({
  issuesFilters = {
    type: [],
    status: [],
    assignee: [],
  },
  searchValue = '',
  projectKey,
  projectId,
  sprintId,
  worklogAuthor,
  additionalJQL,
}: {
  issuesFilters?: {
    type: Array<string>,
    status: Array<string>,
    assignee: Array<string>,
  },
  searchValue?: string,
  projectKey?: string | null,
  projectId?: number | string | null,
  sprintId?: number | string | null,
  worklogAuthor?: string | null,
  additionalJQL?: string | null,
}) {
  const {
    type,
    status,
    assignee,
  } = issuesFilters;
  const jql = [
    (projectId && `project = ${projectId}`),
    (sprintId && `sprint = ${sprintId}`),
    (worklogAuthor && `worklogAuthor = "${worklogAuthor}"`),
    (type.length && `issueType in (${type.join(',')})`),
    (status.length && `status in (${status.join(',')})`),
    (assignee.length && mapAssignee(assignee[0])),
    ((searchValue.length && projectKey) && mapSearchValue(searchValue, projectKey)),
    (additionalJQL && additionalJQL),
  ].filter(f => !!f).join(' AND ');
  return jql;
}

function* fetchAdditionalWorklogsForIssues(issues) {
  try {
    const incompleteIssues = issues.filter(issue => issue.fields.worklog.total > 20);
    if (incompleteIssues.length) {
      yield call(
        infoLog,
        'found issues lacking worklogs',
        incompleteIssues,
      );
      const {
        additionalIssuesArr,
      } = yield call(getAdditionalWorklogsForIssues, incompleteIssues);
      yield call(
        infoLog,
        'getAdditionalWorklogsForIssues response:',
        additionalIssuesArr,
      );

      const withAdditionalWorklogs = [
        ...issues,
        ...additionalIssuesArr,
      ];
      yield call(
        infoLog,
        'filled issues with lacking worklogs: ',
        withAdditionalWorklogs,
      );
      trackMixpanel('Additional worklogs was fetched');
      return withAdditionalWorklogs;
    }
    return issues;
  } catch (err) {
    Raven.captureMessage('Fetch additional worklog issue', {
      level: 'error',
      extra: {
        issues,
      },
    });
    throw err;
  }
}

export function* fetchIssues({
  payload: {
    startIndex,
    stopIndex,
    resolve,
  },
  tryCount = 0,
}: {
  payload: {
    startIndex: number,
    stopIndex: number,
    resolve: null | () => void,
  },
  tryCount: number,
}): Generator<*, *, *> {
  const actions = createActionCreators('read', {
    resourceName: 'issues',
    request: 'filterIssues',
    list: 'filterIssues',
    startIndex,
    indexedList: true,
    mergeListIds: true,
  });
  try {
    yield call(
      infoLog,
      'started fetchIssues',
    );
    yield put(actions.pending());

    const issuesSourceId: string | null = yield select(getUiState('issuesSourceId'));
    const issuesSourceType: string | null = yield select(getUiState('issuesSourceType'));
    const issuesSprintId: string | null = yield select(getUiState('issuesSprintId'));
    const searchValue: string = yield select(getUiState('issuesSearch'));
    const issuesFilters = yield select(getUiState('issuesFilters'));
    const projectId = yield select(getCurrentProjectId);

    const projectsMap = yield select(getResourceMap('projects'));
    const project = projectsMap[projectId];
    const projectKey = project ? project.key : null;

    const epicLinkFieldId: string | null = yield select(getFieldIdByName('Epic Link'));
    const jql: string = buildJQLQuery({
      issuesFilters,
      projectKey,
      searchValue,
      projectId: issuesSourceType === 'project' ? issuesSourceId : null,
      sprintId: issuesSourceType === 'scrum' ? issuesSprintId : null,
    });

    const response = (jql.length || (issuesSourceType !== 'project' && issuesSourceId)) ?
      yield call(
        Api.fetchIssues,
        {
          startIndex,
          stopIndex,
          jql,
          boardId: issuesSourceType !== 'project' ? issuesSourceId : null,
          additionalFields: epicLinkFieldId ? [epicLinkFieldId] : [],
          timeout: tryCount ? 8000 : 3000,
        },
      ) :
      {
        total: 0,
        issues: [],
      };
    yield call(
      infoLog,
      'fetchIssues response',
      response,
    );
    const issues = yield call(
      fetchAdditionalWorklogsForIssues,
      response.issues,
    );
    yield put(resourcesActions.setResourceMeta({
      resourceName: 'issues',
      meta: {
        filterIssuesTotalCount: response.total,
      },
    }));
    const normalizedIssues = normalizeIssues(issues);
    yield put(actions.succeeded({
      resources: normalizedIssues.result,
      includedResources: normalizedIssues.entities,
    }));
    if (resolve) {
      resolve();
    }
  } catch (err) {
    if (err.code === 'ETIMEDOUT' && !tryCount) {
      yield fork(
        fetchIssues,
        {
          tryCount: tryCount + 1,
          payload: {
            startIndex,
            stopIndex,
            resolve,
          },
        },
      );
    } else {
      yield put(resourcesActions.setResourceMeta({
        resourceName: 'issues',
        meta: {
          filterIssuesTotalCount: 0,
        },
      }));
      yield put(actions.succeeded({
        resources: [],
      }));
      yield call(throwError, err);
    }
  }
}

export function* fetchRecentIssues(): Generator<*, *, *> {
  const actions = createActionCreators('read', {
    resourceName: 'issues',
    request: 'recentIssues',
    list: 'recentIssues',
  });
  try {
    yield call(
      infoLog,
      'started fetchRecentIssues',
    );
    yield put(actions.pending());

    const issuesSourceId: string | null = yield select(getUiState('issuesSourceId'));
    const issuesSourceType: string | null = yield select(getUiState('issuesSourceType'));
    const issuesSprintId: string | null = yield select(getUiState('issuesSprintId'));

    const epicLinkFieldId: string | null = yield select(getFieldIdByName('Epic Link'));

    const profile = yield select(getUserData);
    const jql: string = buildJQLQuery({
      projectId: issuesSourceType === 'project' ? issuesSourceId : null,
      sprintId: issuesSourceType === 'scrum' ? issuesSprintId : null,
      worklogAuthor: profile.key,
      additionalJQL: 'timespent > 0 AND worklogDate >= "-4w"',
    });

    const response = (
      (issuesSprintId && issuesSourceId) ||
      (!issuesSprintId && issuesSourceId) ||
      jql.length
    ) ?
      yield call(
        Api.fetchIssues,
        {
          startIndex: 0,
          stopIndex: 1000,
          jql,
          boardId: issuesSourceType !== 'project' ? issuesSourceId : null,
          additionalFields: epicLinkFieldId ? [epicLinkFieldId] : [],
        },
      ) :
      {
        total: 0,
        issues: [],
      };
    yield call(
      infoLog,
      'fetchRecentIssues response',
      response,
    );
    const issues = yield call(
      fetchAdditionalWorklogsForIssues,
      response.issues,
    );
    const normalizedIssues = normalizeIssues(issues);
    yield put(actions.succeeded({
      resources: normalizedIssues.result,
      includedResources: normalizedIssues.entities,
    }));
  } catch (err) {
    yield put(actions.succeeded({
      resources: [],
    }));
    yield call(throwError, err);
  }
}

export function* refetchIssues(debouncing: boolean): Generator<*, void, *> {
  try {
    if (debouncing) {
      yield call(delay, 500);
    }
    yield put(resourcesActions.clearResourceList({
      resourceName: 'issues',
      list: 'filterIssues',
    }));
    yield put(resourcesActions.setResourceMeta({
      resourceName: 'issues',
      meta: {
        filterIssuesTotalCount: 10,
      },
    }));
    yield put(resourcesActions.setResourceMeta({
      resourceName: 'issues',
      meta: {
        refetchFilterIssuesMarker: true,
      },
    }));

    const sidebarType = yield select(getUiState('sidebarType'));
    if (sidebarType === 'recent') {
      yield put(resourcesActions.clearResourceList({
        resourceName: 'issues',
        list: 'recentIssues',
      }));
      yield call(fetchRecentIssues);
    }
  } catch (err) {
    yield call(throwError, err);
  }
}

export function* getIssueTransitions(issueId: string | number): Generator<*, void, *> {
  const actions = createActionCreators('read', {
    resourceName: 'issuesStatuses',
    request: 'issueTransitions',
    list: 'issueTransitions',
    mergeListIds: false,
  });
  try {
    yield put(actions.pending());
    yield call(
      infoLog,
      `getting available issue transitions for ${issueId}`,
    );
    const { transitions } = yield call(Api.getIssueTransitions, issueId);
    yield put(actions.succeeded({
      resources: transitions,
    }));
    yield call(
      infoLog,
      `got issue ${issueId} available transitions`,
      transitions,
    );
  } catch (err) {
    yield call(throwError, err);
  }
}

export function* transitionIssue({
  issueId,
  transitionId,
}: {
  issueId: Id,
  transitionId: Id,
}): Generator<*, void, *> {
  const issuesA = createActionCreators('update', {
    resourceName: 'issues',
    request: 'updateIssue',
  });
  try {
    const issue = yield select(getResourceItemBydId('issues', issueId));
    const transition = yield select(getResourceItemBydId('issuesStatuses', transitionId));

    yield put(issuesA.pending());
    yield fork(notify, {
      resourceName: 'issues',
      request: 'updateIssue',
      spinnerTitle: 'Please wait',
      description: '',
      title: `Moved issue ${issue.key} to ${transition.to.name}`,
    });
    yield call(
      Api.transitionIssue,
      issueId,
      transitionId,
    );

    yield put(issuesA.succeeded({
      resources: [{
        ...issue,
        fields: {
          ...issue.fields,
          status: transition.to,
        },
      }],
    }));
    yield fork(getIssueTransitions, issueId);
    yield fork(refetchIssues, false);

    trackMixpanel('Transition of an issue was done');
  } catch (err) {
    yield put(issuesA.succeeded({
      resources: [],
    }));
    yield call(throwError, err);
  }
}

export function* issueSelectFlow(issueId: string | number): Generator<*, *, *> {
  yield fork(getIssueTransitions, issueId);
  yield fork(getIssueComments, issueId);
}

export function* assignIssue({
  issueId,
}: {
  issueId: Id,
}): Generator<*, void, *> {
  const issuesA = createActionCreators('update', {
    resourceName: 'issues',
    request: 'updateIssue',
  });
  try {
    yield put(issuesA.pending());

    const issue = yield select(getResourceItemBydId('issues', issueId));
    const userData = yield select(getUserData);

    yield call(
      infoLog,
      `assigning issue ${issue.key} to self (${userData.key})`,
    );
    yield call(Api.assignIssue, { issueKey: issue.key, assignee: userData.key });
    yield call(
      infoLog,
      `succesfully assigned issue ${issue.key} to self (${userData.key})`,
    );

    yield put(issuesA.succeeded({
      resources: [{
        ...issue,
        fields: {
          ...issue.fields,
          assignee: userData,
        },
      }],
    }));

    yield fork(notify, {
      title: `${issue.key} is assigned to you`,
    });
    trackMixpanel('Issue was assigned to user');
  } catch (err) {
    yield fork(notify, {
      title: 'Cannot assign issue. Probably no permission',
    });
    yield call(throwError, err);
  }
}

export function* fetchIssueFields(): Generator<*, void, *> {
  const actions = createActionCreators('read', {
    resourceName: 'issuesFields',
    request: 'issuesFields',
    list: 'allFields',
    mergeListIds: true,
  });
  try {
    yield put(actions.pending());
    yield call(infoLog, 'fetching issue fields');
    const issuesFields = yield call(Api.fetchIssueFields);
    yield put(actions.succeeded({
      resources: issuesFields,
    }));
    yield call(infoLog, 'got issue fields', issuesFields);
  } catch (err) {
    yield call(throwError, err);
  }
}

export function* fetchEpics(): Generator<*, void, *> {
  const actions = createActionCreators('read', {
    resourceName: 'issues',
    request: 'epicIssues',
    list: 'epicIssues',
    mergeListIds: true,
  });
  try {
    yield put(actions.pending());
    yield call(infoLog, 'fetching epics');
    const { issues } = yield call(Api.fetchEpics);
    yield put(actions.succeeded({
      resources: issues,
    }));
    yield call(infoLog, 'got epics', issues);
  } catch (err) {
    yield put(actions.succeeded({
      resources: [],
    }));
    yield call(throwError, err);
  }
}


function getNewIssueChannelListener(channel) {
  return function* listenNewIssue() {
    while (true) {
      const { payload } = yield take(channel);
      const actions = createActionCreators('create', {
        resourceName: 'issues',
        request: 'createIssue',
      });
      try {
        const issueKey = payload[0];
        const issue = yield call(Api.fetchIssueByKey, issueKey);
        yield put(actions.pending());
        yield fork(notify, {
          title: `${issue.key} was created`,
        });
        issue.fields.worklogs = [];
        yield put(actions.succeeded({
          resources: [issue],
        }));
        yield put(uiActions.setUiState(
          'selectedIssueId',
          issue.id,
        ));
        yield fork(refetchIssues, false);
        trackMixpanel('New issue was created');
      } catch (err) {
        yield call(throwError, err);
      }
    }
  };
}

export function* createIpcNewIssueListener(): Generator<*, *, *> {
  const newIssueChannel = yield call(createIpcChannel, 'newIssue');
  yield fork(getNewIssueChannelListener(newIssueChannel));
}

export function* watchFetchIssuesRequest(): Generator<*, *, *> {
  yield takeEvery(actionTypes.FETCH_ISSUES_REQUEST, fetchIssues);
}

export function* watchFetchRecentIssuesRequest(): Generator<*, *, *> {
  yield takeEvery(actionTypes.FETCH_RECENT_ISSUES_REQUEST, fetchRecentIssues);
}

export function* watchTransitionIssueRequest(): Generator<*, *, *> {
  yield takeEvery(actionTypes.TRANSITION_ISSUE_REQUEST, transitionIssue);
}

export function* watchAssignIssueRequest(): Generator<*, *, *> {
  yield takeEvery(actionTypes.ASSIGN_ISSUE_REQUEST, assignIssue);
}

export function* watchReFetchIssuesRequest(): Generator<*, *, *> {
  let task;
  while (true) {
    const { debouncing } = yield take(actionTypes.REFETCH_ISSUES_REQUEST);
    if (task) {
      yield cancel(task);
    }
    task = yield fork(refetchIssues, debouncing);
  }
}
