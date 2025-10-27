import PickSubmissionDialog from "../PickSubmissionDialog";

export default function PickSubmissionDialogExample() {
  return (
    <div className="p-8 bg-background min-h-screen flex items-center justify-center">
      <PickSubmissionDialog onSubmit={(picks) => console.log("Picks submitted:", picks)} />
    </div>
  );
}
