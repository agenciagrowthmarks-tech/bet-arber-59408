import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Combos() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl md:text-4xl font-bold">Combos Otimizados com IA</h1>
          <Badge variant="outline" className="bg-chart-2/10">🧪 Modo experimental</Badge>
        </div>
        <p className="text-muted-foreground">
          Monte múltiplos e veja a probabilidade de sucesso calculada automaticamente.
        </p>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Em breve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta funcionalidade está em desenvolvimento. Em breve você poderá selecionar múltiplos jogos 
              e visualizar a probabilidade conjunta de acerto e o retorno potencial do combo.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
