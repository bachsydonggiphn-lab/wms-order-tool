import { SkuGroupsMap } from '../types';

export const DEFAULT_AREA_ORDER: string[] = [
  'YD-A',
  'YD-B',
  'YD-D',
  'YD-G',
  'YD-H',
  'YD-K',
  'YD-L',
  'YD-P',
  'YD-W',
  'YD-HM',
  'YD-SD',
  'YD-HMC',
  'YD-HMS',
];

export const DEFAULT_SKU_GROUPS: SkuGroupsMap = {
  'YD-A': [
    'YD-A12-1', 'YD-A12-10', 'YD-A12-11', 'YD-A12-12', 'YD-A12-13',
    'YD-A12-2', 'YD-A12-3', 'YD-A12-4', 'YD-A12-5', 'YD-A12-6', 'YD-A12-9'
  ],
  'YD-B': [
    'YD-B8-1L', 'YD-B8-2L', 'YD-B8-4L', 'YD-B8-5L',
    'YD-B9-1L', 'YD-B9-2L', 'YD-B9-4L', 'YD-B9-5L'
  ],
  'YD-D': [
    'YD-D107-1', 'YD-D107-2', 'YD-D107-3', 'YD-D107-4', 'YD-D107-5',
    'YD-D113-1', 'YD-D113-2', 'YD-D113-3',
    'YD-D114-1', 'YD-D114-2', 'YD-D114-3', 'YD-D114-4', 'YD-D114-5', 'YD-D114-6',
    'YD-D120-1', 'YD-D120-2', 'YD-D120-4', 'YD-D120-5',
    'YD-D121-1', 'YD-D121-2',
    'YD-D138-1', 'YD-D138-3',
    'YD-D146-1',
    'YD-D149-3', 'YD-D149-4', 'YD-D149-5',
    'YD-D150-2', 'YD-D150-3', 'YD-D150-4',
    'YD-D162-3', 'YD-D162-4', 'YD-D162-5',
    'YD-D165-5', 'YD-D165-6',
    'YD-D166-6',
    'YD-D171-5',
    'YD-D172-5',
    'YD-D207-3', 'YD-D207-4',
    'YD-D231-1', 'YD-D231-2', 'YD-D231-3', 'YD-D231-4', 'YD-D231-5', 'YD-D231-6',
    'YD-D90-1', 'YD-D90-2'
  ],
  'YD-G': [
    'YD-G39-2', 'YD-G42-4', 'YD-G48-2',
    'YD-G54-1',
    'YD-G84-1',
    'YD-G87-1',
    'YD-G89-1', 'YD-G89-2',
    'YD-G90-1',
    'YD-G91-1',
    'YD-G92-1'
  ],
  'YD-H': [
    'YD-H124-1',
    'YD-H82-1', 'YD-H82-2', 'YD-H82-3', 'YD-H82-4',
    'YD-H83-1', 'YD-H83-2', 'YD-H83-3', 'YD-H83-4'
  ],
  'YD-HM': [
    'YD-HM1025-B', 'YD-HM1025-B2', 'YD-HM1025-B3', 'YD-HM1025-B4',
    'YD-HM105-B', 'YD-HM105-G', 'YD-HM105-N'
  ],
  'YD-HMC': [
    'YD-HMC96-B', 'YD-HMC96-GD', 'YD-HMC96-GN',
    'YD-HMC96-PE', 'YD-HMC96-PK', 'YD-HMC96-W'
  ],
  'YD-HMS': [
    'YD-HMS41-1', 'YD-HMS41-1G', 'YD-HMS41-1W',
    'YD-HMS41-2', 'YD-HMS41-2G', 'YD-HMS41-2W'
  ],
  'YD-K': [
    'YD-K01-1', 'YD-K01-13', 'YD-K01-14', 'YD-K01-2', 'YD-K01-3',
    'YD-K01-4', 'YD-K01-5', 'YD-K01-6', 'YD-K01-7', 'YD-K01-8', 'YD-K01-9',
    'YD-K02-1', 'YD-K02-3', 'YD-K02-4',
    'YD-K03-1', 'YD-K03-2', 'YD-K03-3', 'YD-K03-4',
    'YD-K10-4',
    'YD-K11-1', 'YD-K11-2',
    'YD-K12-1', 'YD-K12-3', 'YD-K12-4',
    'YD-K32-1', 'YD-K32-2', 'YD-K32-3', 'YD-K32-4',
    'YD-K33-1', 'YD-K33-2', 'YD-K33-3', 'YD-K33-4',
    'YD-K34-1', 'YD-K34-2',
    'YD-K44-1',
    'YD-K45-1', 'YD-K45-2', 'YD-K45-3',
    'YD-K52-1',
    'YD-K53-1', 'YD-K53-2',
    'YD-K54-1',
    'YD-K55-1',
    'YD-K56-2', 'YD-K56-3', 'YD-K56-4',
    'YD-K57-1',
    'YD-K58-1',
    'YD-K59-1',
    'YD-K60-1', 'YD-K60-2', 'YD-K60-3'
  ],
  'YD-L': [
    'YD-L08-1',
    'YD-L13-1', 'YD-L13-2',
    'YD-L14-1',
    'YD-L17-1', 'YD-L17-2', 'YD-L17-3', 'YD-L17-5',
    'YD-L22-1', 'YD-L22-2', 'YD-L22-3',
    'YD-L24-1', 'YD-L24-2', 'YD-L24-3', 'YD-L24-4', 'YD-L24-5', 'YD-L24-6',
    'YD-L25-1', 'YD-L25-2', 'YD-L25-3',
    'YD-L27-1', 'YD-L27-2', 'YD-L27-5',
    'YD-L35-1',
    'YD-L38-1',
    'YD-L44-1', 'YD-L44-2', 'YD-L44-3',
    'YD-L46-1',
    'YD-L57-1', 'YD-L57-2',
    'YD-L60-1', 'YD-L60-2', 'YD-L60-3',
    'YD-L65-1', 'YD-L65-2', 'YD-L65-3',
    'YD-L67-1', 'YD-L67-2', 'YD-L67-3',
    'YD-L76-1', 'YD-L76-2', 'YD-L76-3', 'YD-L76-4',
    'YD-L77-1', 'YD-L77-2', 'YD-L77-3', 'YD-L77-4',
    'YD-L80-1', 'YD-L80-2', 'YD-L80-4', 'YD-L80-5',
    'YD-L81-1'
  ],
  'YD-P': [
    'YD-P-Y301-09', 'YD-P-Y301-12', 'YD-P-Y301-B', 'YD-P-Y301-G',
    'YD-P-Y301-G2', 'YD-P-Y301-K', 'YD-P-Y301-P2', 'YD-P-Y301-W',
    'YD-P-Y301-X'
  ],
  'YD-SD': ['YD-SD999'],
  'YD-W': [
    'YD-W127-1',
    'YD-W145-1',
    'YD-W152-1', 'YD-W152-2', 'YD-W152-3', 'YD-W152-4',
    'YD-W152-5', 'YD-W152-6', 'YD-W152-7', 'YD-W152-8',
    'YD-W160-1', 'YD-W160-2',
    'YD-W161-1', 'YD-W161-2', 'YD-W161-3', 'YD-W161-4',
    'YD-W161-5', 'YD-W161-6', 'YD-W161-7',
    'YD-W178-1', 'YD-W178-2', 'YD-W178-3', 'YD-W178-4',
    'YD-W179-1', 'YD-W179-4',
    'YD-W181-2', 'YD-W181-3',
    'YD-W193-1', 'YD-W193-2',
    'YD-W194-1', 'YD-W194-2', 'YD-W194-3',
    'YD-W28-1', 'YD-W28-2', 'YD-W28-3',
    'YD-W31-11', 'YD-W31-12', 'YD-W31-13', 'YD-W31-14', 'YD-W31-15',
    'YD-W75-1',
    'YD-W82-1', 'YD-W82-1-0', 'YD-W82-2', 'YD-W82-2-0',
    'YD-W82-3', 'YD-W82-3-0', 'YD-W82-4', 'YD-W82-4-0',
    'YD-W82-5', 'YD-W82-5-0'
  ],
  'Thảm Yoga': [
    'YD-B8-1L', 'YD-B8-2L', 'YD-B8-4L', 'YD-B8-5L',
    'YD-B9-1L', 'YD-B9-2L', 'YD-B9-4L', 'YD-B9-5L',
    'YD-L28-1L', 'YD-L28-1LB', 'YD-L28-2L', 'YD-L28-2LB',
    'YD-L28-3L', 'YD-L28-3LB',
    'YD-L29-1L', 'YD-L29-1LB', 'YD-L29-2L', 'YD-L29-2LB',
    'YD-L29-3L', 'YD-L29-3LB'
  ]
};
