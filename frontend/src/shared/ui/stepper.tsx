"use client";

import { Check } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { useComposedRefs } from "@/shared/lib/compose-refs";
import { cn } from "@/shared/lib/utils";
import { useAsRef } from "@/shared/hooks/use-as-ref";
import { useIsomorphicLayoutEffect } from "@/shared/hooks/use-isomorphic-layout-effect";
import { useLazyRef } from "@/shared/hooks/use-lazy-ref";

const ROOT_NAME = "Stepper";
const LIST_NAME = "StepperList";
const ITEM_NAME = "StepperItem";
const TRIGGER_NAME = "StepperTrigger";
const INDICATOR_NAME = "StepperIndicator";
const SEPARATOR_NAME = "StepperSeparator";
const TITLE_NAME = "StepperTitle";
const CONTENT_NAME = "StepperContent";

type Direction = "ltr" | "rtl";
type Orientation = "horizontal" | "vertical";
type DataState = "inactive" | "active" | "completed";

interface DivProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
}
interface ButtonProps extends React.ComponentProps<"button"> {
  asChild?: boolean;
}

function getId(
  id: string,
  variant: "trigger" | "content" | "title",
  value: string
) {
  return `${id}-${variant}-${value}`;
}

function getDataState(
  value: string | undefined,
  itemValue: string,
  stepState: StepState | undefined,
  steps: Map<string, StepState>,
  variant: "item" | "separator" = "item"
): DataState {
  const stepKeys = Array.from(steps.keys());
  const currentIndex = stepKeys.indexOf(itemValue);
  if (stepState?.completed) return "completed";
  if (value === itemValue) {
    return variant === "separator" ? "inactive" : "active";
  }
  if (value) {
    const activeIndex = stepKeys.indexOf(value);
    if (activeIndex > currentIndex) return "completed";
  }
  return "inactive";
}

interface StepState {
  value: string;
  completed: boolean;
  disabled: boolean;
}

interface StoreState {
  steps: Map<string, StepState>;
  value: string;
}

interface Store {
  subscribe: (callback: () => void) => () => void;
  getState: () => StoreState;
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  notify: () => void;
  addStep: (value: string, completed: boolean, disabled: boolean) => void;
  removeStep: (value: string) => void;
  setStep: (value: string, completed: boolean, disabled: boolean) => void;
}

const StoreContext = React.createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

function useStore<T>(selector: (state: StoreState) => T): T {
  const store = useStoreContext("useStore");
  const getSnapshot = React.useCallback(
    () => selector(store.getState()),
    [store, selector]
  );
  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface StepperContextValue {
  rootId: string;
  dir: Direction;
  orientation: Orientation;
  disabled: boolean;
  nonInteractive: boolean;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepperContext(consumerName: string) {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

interface StepperProps extends DivProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  dir?: Direction;
  orientation?: Orientation;
  disabled?: boolean;
  nonInteractive?: boolean;
}

function Stepper(props: StepperProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    dir: dirProp,
    orientation = "horizontal",
    asChild,
    disabled = false,
    nonInteractive = false,
    className,
    id,
    ...rootProps
  } = props;

  const listenersRef = useLazyRef(() => new Set<() => void>());
  const stateRef = useLazyRef<StoreState>(() => ({
    steps: new Map(),
    value: value ?? defaultValue ?? "",
  }));

  const propsRef = useAsRef({ onValueChange });

  const store = React.useMemo<Store>(() => {
    const s: Store = {
      subscribe: (cb) => {
        listenersRef.current!.add(cb);
        return () => listenersRef.current!.delete(cb);
      },
      getState: () => stateRef.current!,
      setState: (key, val) => {
        const state = stateRef.current!;
        if (Object.is(state[key], val)) return;
        if (key === "value" && typeof val === "string") {
          state.value = val;
          propsRef.current.onValueChange?.(val);
        } else if (key === "steps") {
          state.steps = val as StoreState["steps"];
        }
        s.notify();
      },
      addStep: (v, completed, disabled) => {
        stateRef.current!.steps.set(v, { value: v, completed, disabled });
        s.notify();
      },
      removeStep: (v) => {
        stateRef.current!.steps.delete(v);
        s.notify();
      },
      setStep: (v, completed, disabled) => {
        const step = stateRef.current!.steps.get(v);
        if (step) {
          stateRef.current!.steps.set(v, { ...step, completed, disabled });
          s.notify();
        }
      },
      notify: () => {
        for (const cb of listenersRef.current!) cb();
      },
    };
    return s;
  }, [listenersRef, stateRef, propsRef]);

  useIsomorphicLayoutEffect(() => {
    if (value !== undefined) {
      store.setState("value", value);
    }
  }, [value, store]);

  const dir = dirProp ?? "ltr";
  const instanceId = React.useId();
  const rootId = id ?? instanceId;

  const contextValue = React.useMemo<StepperContextValue>(
    () => ({
      rootId,
      dir,
      orientation,
      disabled,
      nonInteractive,
    }),
    [rootId, dir, orientation, disabled, nonInteractive]
  );

  const RootPrimitive = asChild ? Slot : "div";

  return (
    <StoreContext.Provider value={store}>
      <StepperContext.Provider value={contextValue}>
        <RootPrimitive
          id={rootId}
          data-disabled={disabled ? "" : undefined}
          data-orientation={orientation}
          dir={dir}
          {...rootProps}
          className={cn(
            "flex gap-6",
            orientation === "horizontal" ? "w-full flex-col" : "flex-row",
            className
          )}
        />
      </StepperContext.Provider>
    </StoreContext.Provider>
  );
}

interface StepperItemContextValue {
  value: string;
  stepState: StepState | undefined;
}

const StepperItemContext = React.createContext<StepperItemContextValue | null>(null);

function useStepperItemContext(consumerName: string) {
  const context = React.useContext(StepperItemContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
  }
  return context;
}

interface StepperItemProps extends DivProps {
  value: string;
  completed?: boolean;
  disabled?: boolean;
}

function StepperItem(props: StepperItemProps) {
  const {
    value: itemValue,
    completed = false,
    disabled = false,
    asChild,
    className,
    children,
    ref,
    ...itemProps
  } = props;

  const context = useStepperContext(ITEM_NAME);
  const store = useStoreContext(ITEM_NAME);
  const orientation = context.orientation;
  const value = useStore((state) => state.value);

  useIsomorphicLayoutEffect(() => {
    store.addStep(itemValue, completed, disabled);
    return () => store.removeStep(itemValue);
  }, [itemValue, completed, disabled]);

  useIsomorphicLayoutEffect(() => {
    store.setStep(itemValue, completed, disabled);
  }, [itemValue, completed, disabled]);

  const stepState = useStore((state) => state.steps.get(itemValue));
  const steps = useStore((state) => state.steps);
  const dataState = getDataState(value, itemValue, stepState, steps);

  const itemContextValue = React.useMemo<StepperItemContextValue>(
    () => ({ value: itemValue, stepState }),
    [itemValue, stepState]
  );

  const ItemPrimitive = asChild ? Slot : "div";

  return (
    <StepperItemContext.Provider value={itemContextValue}>
      <ItemPrimitive
        data-disabled={stepState?.disabled ? "" : undefined}
        data-orientation={orientation}
        data-state={dataState}
        {...itemProps}
        ref={ref}
        className={cn(
          "relative flex flex-1 last:flex-none items-center",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          className
        )}
      >
        {children}
      </ItemPrimitive>
    </StepperItemContext.Provider>
  );
}

function StepperTrigger(props: ButtonProps) {
  const {
    asChild,
    onClick: onClickProp,
    disabled,
    className,
    ref,
    ...triggerProps
  } = props;

  const context = useStepperContext(TRIGGER_NAME);
  const itemContext = useStepperItemContext(TRIGGER_NAME);
  const itemValue = itemContext.value;

  const store = useStoreContext(TRIGGER_NAME);
  const value = useStore((state) => state.value);
  const steps = useStore((state) => state.steps);
  const stepState = useStore((state) => state.steps.get(itemValue));

  const stepIndex = Array.from(steps.keys()).indexOf(itemValue);
  const stepPosition = stepIndex + 1;
  const stepCount = steps.size;

  const triggerId = getId(context.rootId, "trigger", itemValue);
  const contentId = getId(context.rootId, "content", itemValue);
  const titleId = getId(context.rootId, "title", itemValue);

  const isDisabled = disabled || stepState?.disabled || context.disabled;
  const isActive = value === itemValue;
  const dataState = getDataState(value, itemValue, stepState, steps);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const composedRef = useComposedRefs(
    ref as React.Ref<HTMLButtonElement>,
    triggerRef
  );

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClickProp?.(event);
      if (event.defaultPrevented) return;
      if (!isDisabled && !context.nonInteractive) {
        store.setState("value", itemValue);
      }
    },
    [isDisabled, context.nonInteractive, store, itemValue, onClickProp]
  );

  const TriggerPrimitive = asChild ? Slot : "button";

  return (
    <TriggerPrimitive
      id={triggerId}
      role="tab"
      type="button"
      aria-controls={contentId}
      aria-current={isActive ? "step" : undefined}
      aria-describedby={titleId}
      aria-posinset={stepPosition}
      aria-selected={isActive}
      aria-setsize={stepCount}
      data-disabled={isDisabled ? "" : undefined}
      data-state={dataState}
      disabled={isDisabled}
      {...triggerProps}
      ref={composedRef}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      onClick={onClick}
    />
  );
}

interface StepperIndicatorProps extends Omit<DivProps, "children"> {
  children?: React.ReactNode | ((dataState: DataState) => React.ReactNode);
}

function StepperIndicator(props: StepperIndicatorProps) {
  const { className, children, asChild, ref, ...indicatorProps } = props;

  const context = useStepperContext(INDICATOR_NAME);
  const itemContext = useStepperItemContext(INDICATOR_NAME);

  const value = useStore((state) => state.value);
  const itemValue = itemContext.value;
  const stepState = useStore((state) => state.steps.get(itemValue));
  const steps = useStore((state) => state.steps);

  const stepPosition = Array.from(steps.keys()).indexOf(itemValue) + 1;
  const dataState = getDataState(value, itemValue, stepState, steps);

  const IndicatorPrimitive = asChild ? Slot : "div";

  return (
    <IndicatorPrimitive
      data-state={dataState}
      dir={context.dir}
      {...indicatorProps}
      ref={ref}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-muted bg-background font-medium text-muted-foreground text-sm transition-colors",
        "data-[state=active]:border-primary data-[state=completed]:border-primary data-[state=active]:bg-primary data-[state=completed]:bg-primary data-[state=active]:text-primary-foreground data-[state=completed]:text-primary-foreground",
        className
      )}
    >
      {typeof children === "function"
        ? children(dataState)
        : children ?? (dataState === "completed" ? <Check className="size-4" /> : stepPosition)}
    </IndicatorPrimitive>
  );
}

interface StepperSeparatorProps extends DivProps {
  forceMount?: boolean;
}

function StepperSeparator(props: StepperSeparatorProps) {
  const {
    className,
    asChild,
    forceMount = false,
    ref,
    ...separatorProps
  } = props;

  const context = useStepperContext(SEPARATOR_NAME);
  const itemContext = useStepperItemContext(SEPARATOR_NAME);
  const value = useStore((state) => state.value);
  const steps = useStore((state) => state.steps);
  const orientation = context.orientation;

  const stepIndex = Array.from(steps.keys()).indexOf(itemContext.value);
  const isLastStep = stepIndex === steps.size - 1;

  if (isLastStep && !forceMount) return null;

  const dataState = getDataState(
    value,
    itemContext.value,
    itemContext.stepState,
    steps,
    "separator"
  );

  const SeparatorPrimitive = asChild ? Slot : "div";

  return (
    <SeparatorPrimitive
      role="separator"
      aria-hidden="true"
      aria-orientation={orientation}
      data-state={dataState}
      dir={context.dir}
      {...separatorProps}
      ref={ref}
      className={cn(
        "mx-5 bg-border transition-colors data-[state=active]:bg-primary data-[state=completed]:bg-primary",
        orientation === "horizontal" ? "h-px flex-1" : "h-10 w-px",
        className
      )}
    />
  );
}

interface StepperTitleProps extends React.ComponentProps<"span"> {
  asChild?: boolean;
}

function StepperTitle(props: StepperTitleProps) {
  const { className, asChild, ref, ...titleProps } = props;

  const context = useStepperContext(TITLE_NAME);
  const itemContext = useStepperItemContext(TITLE_NAME);
  const titleId = getId(context.rootId, "title", itemContext.value);

  const TitlePrimitive = asChild ? Slot : "span";

  return (
    <TitlePrimitive
      id={titleId}
      dir={context.dir}
      {...titleProps}
      ref={ref}
      className={cn("font-medium text-sm", className)}
    />
  );
}

interface StepperContentProps extends DivProps {
  value: string;
  forceMount?: boolean;
}

function StepperContent(props: StepperContentProps) {
  const {
    value: valueProp,
    asChild,
    forceMount = false,
    ref,
    className,
    ...contentProps
  } = props;

  const context = useStepperContext(CONTENT_NAME);
  const value = useStore((state) => state.value);

  const contentId = getId(context.rootId, "content", valueProp);
  const triggerId = getId(context.rootId, "trigger", valueProp);

  if (valueProp !== value && !forceMount) return null;

  const ContentPrimitive = asChild ? Slot : "div";

  return (
    <ContentPrimitive
      id={contentId}
      role="tabpanel"
      aria-labelledby={triggerId}
      dir={context.dir}
      {...contentProps}
      ref={ref}
      className={cn("flex-1 outline-none", className)}
    />
  );
}

function StepperList(props: DivProps) {
  const {
    asChild,
    className,
    children,
    ref,
    ...listProps
  } = props;

  const context = useStepperContext(LIST_NAME);
  const orientation = context.orientation;

  const ListPrimitive = asChild ? Slot : "div";

  return (
    <ListPrimitive
      role="tablist"
      aria-orientation={orientation}
      data-orientation={orientation}
      dir={context.dir}
      {...listProps}
      ref={ref}
      className={cn(
        "flex outline-none",
        orientation === "horizontal"
          ? "flex-row items-center"
          : "flex-col items-start",
        className
      )}
    >
      {children}
    </ListPrimitive>
  );
}

export {
  Stepper,
  StepperList,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperContent,
  useStore as useStepper,
  type StepperProps,
};
