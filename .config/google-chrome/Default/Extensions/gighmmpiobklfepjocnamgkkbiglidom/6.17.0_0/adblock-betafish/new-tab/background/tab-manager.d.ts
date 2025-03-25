import { NewTab } from "./middleware";
import { ForceExperimentState } from "./tab-manager.types";
export declare function compareNewTabRequestsByPriority(newTabA: NewTab, newTabB: NewTab): number;
export declare function isCoolDownPeriodOngoing(): Promise<boolean>;
export declare function shouldForce(): Promise<ForceExperimentState>;
