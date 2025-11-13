"use client";

import { Users, Plus, User, Building } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PartiesTabProps {
  caseId: string;
  parties: any[];
  onUpdate: () => void;
}

export function PartiesTab({ caseId, parties, onUpdate }: PartiesTabProps) {
  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      plaintiff: "default",
      defendant: "destructive",
      plaintiff_attorney: "secondary",
      defendant_attorney: "outline",
    };

    return (
      <Badge variant={variants[role] || "outline"} className="capitalize">
        {role.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground text-lg font-medium">Parties & Contacts</h3>
          <p className="text-muted-foreground text-sm">Plaintiffs, defendants, attorneys, and witnesses</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Party
        </Button>
      </div>

      {parties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="text-muted-foreground mb-4 size-12" />
            <h3 className="text-foreground text-lg font-medium">No parties added</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Add plaintiffs, defendants, attorneys, and other parties to this case
            </p>
            <Button>
              <Plus className="mr-2 size-4" />
              Add First Party
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {parties.map((party: any) => (
            <Card key={party.contactId}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="bg-muted rounded-full p-2">
                    {party.entityName ? <Building className="size-4" /> : <User className="size-4" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium">
                        {party.firstName && party.lastName
                          ? `${party.firstName} ${party.lastName}`
                          : party.entityName || "Unknown"}
                      </p>
                      {party.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    {getRoleBadge(party.role)}
                    {party.email && <p className="text-muted-foreground text-xs">{party.email}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
