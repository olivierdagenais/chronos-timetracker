// @flow
import React from 'react';
import type { StatelessFunctionalComponent, Node } from 'react';

import type {
  SetSidebarType,
} from '../../../types';

import {
  Tab,
} from './styled';


type Props = {
  active: boolean,
  label: 'Recent worklogs' | 'Issues',
  onClick: SetSidebarType,
};

const SidebarHeaderTab: StatelessFunctionalComponent<Props> = ({
  active,
  label,
  onClick,
}: Props): Node =>
  <Tab
    active={active}
    onClick={() => onClick(label === 'Issues' ? 'all' : 'recent')}
  >
    {label}
  </Tab>;

export default SidebarHeaderTab;
