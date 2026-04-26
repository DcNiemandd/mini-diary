import {
    createContext,
    useContext,
    useId,
    type ButtonHTMLAttributes,
    type FC,
    type HTMLAttributes,
    type ReactNode,
} from 'react';

interface PopoverContextValue {
    triggerId: string;
    contentId: string;
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

const Trigger: FC<TriggerProps> = (props) => {
    const { triggerId, contentId } = usePopoverContext();

    return (
        <button
            id={triggerId}
            popoverTarget={contentId}
            {...props}
        />
    );
};

const Content: FC<ContentProps> = ({ popover = 'auto', style: styleProp, ...props }) => {
    const { triggerId, contentId } = usePopoverContext();

    return (
        <div
            ref={(el) => {
                el?.setAttribute('anchor', triggerId);
            }}
            popover={popover}
            id={contentId}
            style={{
                top: 'anchor(bottom)',
                left: 'anchor(left)',
                ...styleProp,
            }}
            {...props}
        />
    );
};

export const Popover: FC<PopoverProps> & {
    Trigger: FC<TriggerProps>;
    Content: FC<ContentProps>;
} = ({ children }) => {
    const id = useId();
    const triggerId = `popover-trigger${id}`;
    const contentId = `popover-content${id}`;

    return (
        <PopoverContext.Provider value={{ triggerId, contentId }}>
            {children}
        </PopoverContext.Provider>
    );
};

Popover.Trigger = Trigger;
Popover.Content = Content;
