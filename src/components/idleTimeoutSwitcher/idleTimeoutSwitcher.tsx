import type { FC } from 'react';
import {
    IDLE_TIMEOUT_OPTIONS,
    type IdleTimeoutOption,
    type IdleTimeoutSettings,
} from '../../contexts/settingsContext/settingsContext';

export const IdleTimeoutSwitcher: FC<IdleTimeoutSettings & { id?: string }> = ({ idleTimeout, setIdleTimeout, id }) => {
    return (
        <select
            id={id}
            onChange={(e) => {
                setIdleTimeout(Number(e.target.value) as IdleTimeoutOption);
            }}
            value={idleTimeout}
            style={{ maxWidth: '8rem' }}
        >
            {IDLE_TIMEOUT_OPTIONS.map((option) => (
                <option
                    key={option}
                    value={option}
                >
                    {option} mins {option === 5 && '(default)'}
                </option>
            ))}
        </select>
    );
};
