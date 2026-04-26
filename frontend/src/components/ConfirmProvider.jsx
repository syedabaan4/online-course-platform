import { useCallback, useEffect, useRef, useState } from 'react';
import ConfirmActionModal from './ConfirmActionModal';
import { registerConfirmRunner } from './confirmRegistry';

const ConfirmProvider = ({ children }) => {
	const [payload, setPayload] = useState(null);
	const resolveRef = useRef(null);

	const open = useCallback((input) => {
		return new Promise((resolve) => {
			resolveRef.current = resolve;
			setPayload(input);
		});
	}, []);

	useEffect(() => {
		registerConfirmRunner(open);
		return () => registerConfirmRunner(null);
	}, [open]);

	const close = (result) => {
		const resolve = resolveRef.current;
		resolveRef.current = null;
		setPayload(null);
		resolve?.(result);
	};

	return (
		<>
			{children}
			{payload ? (
				<ConfirmActionModal
					title={payload.title}
					text={payload.text}
					confirmLabel={payload.confirmLabel}
					cancelLabel={payload.cancelLabel}
					danger={payload.danger !== false}
					onCancel={() => close(false)}
					onConfirm={() => close(true)}
				/>
			) : null}
		</>
	);
};

export default ConfirmProvider;
