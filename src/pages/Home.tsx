import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Layers } from "lucide-react";

export default function Home() {
  const modes = [
    {
      icon: TrendingUp,
      title: "Scanner IA",
      description: "Scanner de arbitragem inteligente entre casas — detecta oportunidades em tempo real.",
      color: "text-accent-neon",
      bgColor: "bg-accent-neon/10",
      to: "/surebet",
    },
    {
      icon: Target,
      title: "Risco Inteligente",
      description: "Simule apostas com risco calculado e orientações da IA.",
      color: "text-accent-neon",
      bgColor: "bg-accent-neon/10",
      to: "/risco-calculado",
    },
    {
      icon: Layers,
      title: "Combos IA",
      description: "Combine odds em múltiplos jogos e veja as probabilidades calculadas pela IA.",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      to: "/combos",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">
          Bem-vindo ao PegAI Odds
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Escolha seu modo de análise e simulação com inteligência artificial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modes.map((mode) => (
          <Card
            key={mode.to}
            className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col h-full"
          >
            <CardHeader className="space-y-4 flex-grow">
              <div className={`w-16 h-16 rounded-2xl ${mode.bgColor} flex items-center justify-center`}>
                <mode.icon className={`h-8 w-8 ${mode.color}`} />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl">{mode.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed min-h-[3rem]">
                  {mode.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6">
              <Button asChild className="w-full" size="lg">
                <Link to={mode.to}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Card className="max-w-2xl mx-auto border-muted">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Importante:</strong> Este é um sistema de simulação e análise com IA.
              Nenhuma aposta é enviada automaticamente às casas. Todos os valores são
              apenas para fins educacionais e de planejamento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
