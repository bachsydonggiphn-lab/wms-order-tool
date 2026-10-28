import { SkuGroupsMap } from '../../../../types';

export interface SkuSettingsViewProps {
  skuGroups: SkuGroupsMap;
  onUpdateSkuGroups: (newGroups: SkuGroupsMap) => void;
}
