import {
    createContext,
    useContext,
    useId,
    type ButtonHTMLAttributes,
    type FC,
    type HTMLAttributes,
    type ReactNode,
} from 'react';
import styles from './popover.module.css';

type CssName = `--${string}`;

interface PopoverContextValue {
    triggerId: CssName;
    contentId: CssName;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

const usePopoverContext = () => {
    const ctx = useContext(PopoverContext);
    if (!ctx) throw new Error('Popover compound components must be used within <Popover>');
    return ctx;
};

interface PopoverProps {
    children: ReactNode;
}

type TriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
    popover?: 'auto' | 'manual';
}

const Trigger: FC<TriggerProps> = ({ style: styleProp, ...props }) => {
    const { triggerId, contentId } = usePopoverContext();

    return (
        <button
            id={triggerId}
            popoverTarget={contentId}
            style={{
                ...styleProp,
                anchorName: triggerId,
            }}
            {...props}
        />
    );
};

const Content: FC<ContentProps> = ({ popover = 'auto', style: styleProp, className, ...props }) => {
    const { triggerId, contentId } = usePopoverContext();

    return (
        <div
            popover={popover}
            id={contentId}
            style={{
                ...styleProp,
                positionAnchor: triggerId,
            }}
            className={`${styles.content} ${className ?? ''}`}
            {...props}
        />
    );
};

export const Popover: FC<PopoverProps> & {
    Trigger: FC<TriggerProps>;
    /**
     * You can position the content using CSS variable `--popover-id`. Default is bottom left seen in example:
     * @example
     * <Popover.Content style={{ top: `anchor(var(--popover-id) bottom)`, left: `anchor(var(--popover-id) left)` }}>
     *     Content
     * </Popover.Content>
     */
    Content: FC<ContentProps>;
} = ({ children }) => {
    const id = useId();
    const triggerId: CssName = `--popover-trigger${id}`;
    const contentId: CssName = `--popover-content${id}`;

    return <PopoverContext.Provider value={{ triggerId, contentId }}>{children}</PopoverContext.Provider>;
};

Popover.Trigger = Trigger;
Popover.Content = Content;

