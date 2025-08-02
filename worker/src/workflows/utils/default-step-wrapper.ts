import type { StepWrapper } from "@/entity-processor/services";

export const defaultStepWrapper: StepWrapper = async (
  name: string,
  fn: () => Promise<any>
) => {
  console.log(`[Step] ${name}`);
  return await fn();
};
