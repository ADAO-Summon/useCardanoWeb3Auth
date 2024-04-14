import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useRef } from "react";

export function SignDialog({ message, onSign }: { message: string, onSign: (message:string) => void }) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const onConfirm = () => {
        onSign(message);
        closeRef.current?.click();
    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Sign test message</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Sign Message</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to sign the message <strong>{message}</strong>?
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <div className="flex flex-row gap-4"></div>
                    <DialogClose ref={closeRef} >Cancel</DialogClose>
                    <Button onClick={onConfirm}>Yes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
