export interface ComponentSpec {
  name: string;
  filePath: string;
  purpose: string;
  location: string;
  status: 'prototype' | 'in-progress' | 'ready-for-dev' | 'in-review' | 'production';
  props: PropSpec[];
  states: StateSpec[];
  interactions: InteractionSpec[];
  tokens: TokenSpec;
  flows?: FlowSpec[];
  accessibility: AccessibilitySpec;
  tasks: TaskSpec[];
  notes?: string[];
  hardcodedData?: HardcodedDataSpec[];
}

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export interface StateSpec {
  name: string;
  trigger: string;
  description: string;
  implementedInPrototype: boolean;
  storyProps?: Record<string, unknown>;
  visualNotes?: string;
}

export interface InteractionSpec {
  trigger: string;
  element: string;
  result: string;
  animation?: AnimationSpec;
  keyboard?: string;
}

export interface AnimationSpec {
  property: string;
  from: string;
  to: string;
  duration: string;
  easing: string;
}

export interface TokenSpec {
  colors: TokenEntry[];
  typography: TypographyToken[];
  spacing: TokenEntry[];
  borderRadius?: TokenEntry[];
  shadows?: TokenEntry[];
  breakpoints?: BreakpointToken[];
  animations?: AnimationToken[];
}

export interface TokenEntry {
  name: string;
  value: string;
  usage: string;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  usage: string;
}

export interface BreakpointToken {
  name: string;
  minWidth: string;
  changes: string;
}

export interface AnimationToken {
  name: string;
  property: string;
  duration: string;
  easing: string;
  usage: string;
}

export interface FlowSpec {
  name: string;
  type: 'happy' | 'error' | 'edge-case';
  steps: FlowStep[];
}

export interface FlowStep {
  actor: 'user' | 'system' | 'api';
  action: string;
  result: string;
}

export interface AccessibilitySpec {
  role?: string;
  ariaAttributes?: string[];
  keyboardNav?: string[];
  focusManagement?: string;
  screenReaderNotes?: string;
}

export interface TaskSpec {
  id: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  estimate: 'S' | 'M' | 'L' | 'XL';
  description: string;
  files: FileChange[];
  acceptanceCriteria: string[];
  dependencies?: string[];
}

export interface FileChange {
  path: string;
  action: 'create' | 'modify';
  description: string;
}

export interface HardcodedDataSpec {
  current: string;
  replaceWith: string;
  location: string;
}
