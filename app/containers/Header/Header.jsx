// @flow
import React from 'react';
import {
  connect,
} from 'react-redux';
import {
  bindActionCreators,
} from 'redux';
import DropdownMenu, {
  DropdownItemGroup,
  DropdownItem,
} from '@atlaskit/dropdown-menu';
import {
  shell,
} from 'electron';

import type {
  StatelessFunctionalComponent,
  Node,
} from 'react';

import {
  profileActions,
  authActions,
  uiActions,
  settingsActions,
  issuesActions,
} from 'actions';
import {
  getUserData,
  getHost,
  getUpdateAvailable,
  getUpdateFetching,
  getIssuesFetching,
} from 'selectors';
import {
  cogIcon,
  refreshWhite,
} from 'data/svg';
import config from 'config';

import {
  HeaderContainer,
  ProfileContainer,
  IconsContainer,
  ProfileInfo,
  SettingsIcon,
  ProfilePicture,
  ProfileName,
  ProfileTeam,
  DropdownSeparator,
  UpdateAvailableBadge,
  DropdownLogoutItem,
  DropdownUpdateItem,
  RefreshIcon,
} from './styled';

import type {
  LogoutRequest,
  User,
  UpdateInfo,
  SetSettingsModalOpen,
  SetSettingsModalTab,
  ClearIssues,
  FetchIssuesRequest,
  FetchRecentIssuesRequest,
} from '../../types';


type Props = {
  userData: User,
  host: URL,
  isFetching: boolean,
  updateAvailable: UpdateInfo,
  updateFetching: boolean,

  clearIssues: ClearIssues,
  fetchIssuesRequest: FetchIssuesRequest,
  fetchRecentIssuesRequest: FetchRecentIssuesRequest,

  logoutRequest: LogoutRequest,
  setSettingsModalOpen: SetSettingsModalOpen,
  setSettingsModalTab: SetSettingsModalTab,
};

const Header: StatelessFunctionalComponent<Props> = ({
  userData,
  host,
  isFetching,
  updateAvailable,
  updateFetching,
  logoutRequest,
  setSettingsModalOpen,
  setSettingsModalTab,
  clearIssues,
  fetchIssuesRequest,
  fetchRecentIssuesRequest,
}: Props): Node =>
  <HeaderContainer className="webkit-drag">
    <ProfileContainer>
      <ProfilePicture
        src={userData.avatarUrls['48x48']}
        alt="User avatar"
      />
      <ProfileInfo>
        <ProfileName>
          {userData.displayName}
        </ProfileName>
        <ProfileTeam>
          {host}
        </ProfileTeam>
      </ProfileInfo>
    </ProfileContainer>

    <IconsContainer>
      <RefreshIcon
        src={refreshWhite}
        isFetching={isFetching}
        onClick={() => {
          clearIssues();
          fetchIssuesRequest();
          fetchRecentIssuesRequest();
        }}
        alt="Refresh"
      />
      {updateAvailable && <UpdateAvailableBadge />}
      <DropdownMenu
        triggerType="default"
        position="bottom right"
        trigger={
          <SettingsIcon
            src={cogIcon}
            alt="Settings"
          />
        }
      >
        <DropdownItemGroup>
          <DropdownItem onClick={() => setSettingsModalOpen(true)}>
            Settings
          </DropdownItem>
          <DropdownItem onClick={() => shell.openExternal(config.supportLink)}>
            Support and feedback
          </DropdownItem>
          <DropdownItem onClick={() => shell.openExternal(config.githubLink)}>
            Github
          </DropdownItem>
          <DropdownSeparator />

          {updateAvailable && !updateFetching && [
            <DropdownUpdateItem
              onClick={() => {
                setSettingsModalOpen(true);
                setSettingsModalTab('Updates');
              }}
            >
              {updateAvailable} is out! Update now.
            </DropdownUpdateItem>,
            <DropdownSeparator />,
          ]}

          <DropdownLogoutItem onClick={logoutRequest}>
            Logout
          </DropdownLogoutItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </IconsContainer>
  </HeaderContainer>;


function mapStateToProps(state) {
  return {
    userData: getUserData(state),
    host: getHost(state),
    updateAvailable: getUpdateAvailable(state),
    updateFetching: getUpdateFetching(state),
    isFetching: getIssuesFetching(state),
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    ...profileActions,
    ...authActions,
    ...uiActions,
    ...settingsActions,
    ...issuesActions,
  }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Header);
