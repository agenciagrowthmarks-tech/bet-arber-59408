import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface InvestmentInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
}

export default function InvestmentInput({
  value,
  onChange,
  label = "Valor total para simulação (R$)",
  placeholder = "Ex: 500",
}: InvestmentInputProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={1}
        step={10}
        placeholder={placeholder}
      />
    </div>
  );
}
