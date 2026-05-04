import type { FC } from 'react';
import type { AuthState } from '../../hooks/useAuth';
import styles from './exportImportButtons.module.css';

export const ImportContent: FC<{ auth: AuthState }> = () => {
    // const { close } = useDialog();

    return (
        <div className={styles['content']}>
            <h3>Raw export</h3>
            <p>Diary entries in a readable format.</p>
        </div>
    );
};
